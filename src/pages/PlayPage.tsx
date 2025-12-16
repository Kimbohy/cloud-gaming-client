import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createGameSession,
  startGameSession,
  stopGameSession,
  GameSocketManager,
  GameAudioManager,
  GameCanvasManager,
  GameInputManager,
  PlayApiError,
  type InputButton,
  type StreamMode,
  type KeyMappings,
  loadKeyMappings,
  getKeyDisplayName,
} from "@/api/play.api";
import {
  WebRTCManager,
  WebRTCVideoRenderer,
  WebRTCAudioPlayer,
  setStreamMode as setServerStreamMode,
} from "@/api/webrtc.api";
import { useQueryState } from "nuqs";
import { ControlsConfigDialog } from "@/components/ControlsConfigDialog";
import { SaveStatesModal } from "@/components/SaveStatesModal";

// Error state interface
interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

export default function PlayPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const gameData = location.state as {
    name: string;
    rom: string;
    desc: string;
  };

  const [name, setName] = useQueryState("name");
  const [rom, setRom] = useQueryState("rom", { defaultValue: "" });
  const [desc, setDesc] = useQueryState("desc");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<ErrorState | null>(null);
  const [connected, setConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Stream mode state
  const [streamMode, setStreamMode] = useState<StreamMode>("websocket");

  // Controls config dialog state
  const [showControlsConfig, setShowControlsConfig] = useState(false);
  const [keyMappings, setKeyMappings] = useState<KeyMappings>(loadKeyMappings);

  // Save states modal state
  const [showSaveStatesModal, setShowSaveStatesModal] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const socketManagerRef = useRef<GameSocketManager>(new GameSocketManager());
  const audioManagerRef = useRef<GameAudioManager>(new GameAudioManager());
  const canvasManagerRef = useRef<GameCanvasManager>(new GameCanvasManager());
  const inputManagerRef = useRef<GameInputManager>(
    new GameInputManager(socketManagerRef.current)
  );

  // WebRTC refs
  const webrtcManagerRef = useRef<WebRTCManager>(new WebRTCManager());
  const webrtcVideoRendererRef = useRef<WebRTCVideoRenderer>(
    new WebRTCVideoRenderer()
  );
  const webrtcAudioPlayerRef = useRef<WebRTCAudioPlayer>(
    new WebRTCAudioPlayer()
  );

  // Resume audio on user interaction (required by browsers)
  const resumeAudio = useCallback(() => {
    audioManagerRef.current.resume?.();
    webrtcAudioPlayerRef.current.resume();
  }, []);

  // Send button input directly to socket or WebRTC
  const sendInput = useCallback(
    (button: InputButton, state: "down" | "up") => {
      if (!sessionId) return;

      // Resume audio on any user input
      resumeAudio();

      // Use WebRTC data channel if available for lowest latency
      if (
        streamMode === "webrtc" &&
        webrtcManagerRef.current.isDataChannelReady()
      ) {
        console.log(`[Input] Sending via WebRTC: ${button} ${state}`);
        webrtcManagerRef.current.sendInput(button, state);
      } else {
        // Fallback to WebSocket for input (always available)
        console.log(`[Input] Sending via WebSocket: ${button} ${state}`);
        socketManagerRef.current.sendInput(sessionId, button, state);
      }
    },
    [sessionId, streamMode, resumeAudio]
  );

  // Detect mobile device
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 1024 || "ontouchstart" in window;
      setIsMobile(mobile);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Fullscreen toggle with landscape lock
  const toggleFullscreen = useCallback(async () => {
    if (!gameContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await gameContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
        // Try to lock orientation to landscape
        try {
          await (screen.orientation as any).lock?.("landscape");
        } catch {
          // Orientation lock not supported
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (gameData) {
      setName(gameData.name);
      setRom(gameData.rom);
      setDesc(gameData.desc);
    }
  }, [gameData]);

  // Initialize managers based on stream mode
  useEffect(() => {
    // Always initialize WebSocket for fallback
    audioManagerRef.current.initialize();
    if (canvasRef.current) {
      canvasManagerRef.current.initialize(canvasRef.current);
    }

    const socketManager = socketManagerRef.current;
    socketManager.connect();

    socketManager.onConnect(() => {
      setConnected(true);
      audioManagerRef.current.resume();
    });

    socketManager.onDisconnect(() => setConnected(false));

    // Only handle WebSocket frames if in websocket mode
    socketManager.onFrame((data) => {
      if (streamMode === "websocket" || streamMode === "both") {
        canvasManagerRef.current.renderFrame(data);
      }
    });
    socketManager.onAudio((data) => {
      if (streamMode === "websocket" || streamMode === "both") {
        audioManagerRef.current.playAudio(data);
      }
    });

    // Always initialize WebRTC components (so they're ready for mode switching)
    webrtcAudioPlayerRef.current.initialize();
    if (canvasRef.current) {
      webrtcVideoRendererRef.current.initialize(canvasRef.current);
    }

    const webrtcManager = webrtcManagerRef.current;

    // Always connect the WebRTC signaling socket so it's ready
    webrtcManager.connect();

    webrtcManager.onVideoTrack((stream) => {
      console.log("📹 Video track received");
      webrtcVideoRendererRef.current.setVideoStream(stream);
    });

    webrtcManager.onAudioTrack((stream) => {
      console.log("🔊 Audio track received");
      webrtcAudioPlayerRef.current.setAudioStream(stream);
      // Resume audio playback
      webrtcAudioPlayerRef.current.resume();
    });

    // Handle audio data from DataChannel (fallback/primary method)
    webrtcManager.onAudioData((audioData) => {
      webrtcAudioPlayerRef.current.playPCMAudio(audioData);
    });

    webrtcManager.onError((error) => {
      console.error("WebRTC error:", error);
    });

    return () => {
      socketManager.disconnect();
      audioManagerRef.current.cleanup();
      inputManagerRef.current.cleanup();
      webrtcManagerRef.current.disconnect();
      webrtcVideoRendererRef.current.cleanup();
      webrtcAudioPlayerRef.current.cleanup();
    };
  }, []); // Only run once on mount, not on streamMode changes

  // Re-initialize canvas when fullscreen state changes (canvas element changes)
  useEffect(() => {
    if (canvasRef.current) {
      canvasManagerRef.current.initialize(canvasRef.current);
      webrtcVideoRendererRef.current.initialize(canvasRef.current);
    }
  }, [isFullscreen]);

  useEffect(() => {
    inputManagerRef.current.setSessionId(sessionId);
    if (sessionId) {
      inputManagerRef.current.setupKeyboardControls();
    }
    return () => inputManagerRef.current.cleanup();
  }, [sessionId]);

  // Handle key mappings change
  const handleKeyMappingsChange = useCallback((newMappings: KeyMappings) => {
    setKeyMappings(newMappings);
    inputManagerRef.current.updateKeyMappings(newMappings);
  }, []);

  // Handle save state request (called from SaveStatesModal)
  const handleSaveState = useCallback(async (): Promise<{
    stateData: string;
    thumbnail: string | null;
  } | null> => {
    console.log("[PlayPage] handleSaveState called, sessionId:", sessionId);
    if (!sessionId) {
      console.error("[PlayPage] No sessionId");
      return null;
    }

    const isConnected = webrtcManagerRef.current.isSocketConnected();
    console.log("[PlayPage] Socket connected:", isConnected);

    return new Promise((resolve) => {
      console.log("[PlayPage] Calling webrtcManager.saveState...");
      webrtcManagerRef.current.saveState(sessionId, (result) => {
        console.log("[PlayPage] saveState callback result:", result);
        if (result.success && result.stateData) {
          resolve({
            stateData: result.stateData,
            thumbnail: result.thumbnail ?? null,
          });
        } else {
          console.error("Failed to save state:", result.error);
          resolve(null);
        }
      });
    });
  }, [sessionId]);

  // Handle load state request (called from SaveStatesModal)
  const handleLoadState = useCallback(
    async (stateData: ArrayBuffer): Promise<boolean> => {
      if (!sessionId) return false;

      const base64 = btoa(String.fromCharCode(...new Uint8Array(stateData)));

      return new Promise((resolve) => {
        webrtcManagerRef.current.loadState(sessionId, base64, (result) => {
          resolve(result.success);
        });
      });
    },
    [sessionId]
  );

  // Handle stream mode change
  const handleStreamModeChange = useCallback(
    async (newMode: StreamMode) => {
      setStreamMode(newMode);
      if (sessionId) {
        // Update server stream mode
        const result = await setServerStreamMode(sessionId, newMode);
        if (!result.success) {
          console.error("Failed to change stream mode:", result.error);
          return;
        }

        // Create WebRTC session if switching to webrtc mode
        if (newMode === "webrtc" || newMode === "both") {
          // Make sure WebRTC signaling socket is connected
          if (!webrtcManagerRef.current.isSocketConnected()) {
            webrtcManagerRef.current.connect();
            // Wait a bit for the socket to connect
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          const webrtcSuccess = await webrtcManagerRef.current.createSession(
            sessionId
          );
          if (webrtcSuccess) {
            // setWebrtcConnected(true);
          } else {
            console.warn("WebRTC session creation failed during mode switch");
          }
        }
      }
    },
    [sessionId]
  );

  const createSession = async () => {
    try {
      setError(null);
      setStatus("Creating...");
      const data = await createGameSession(rom, streamMode);
      setSessionId(data.sessionId);
      setStatus("Created");

      // Subscribe to WebSocket session
      socketManagerRef.current.subscribeToSession(data.sessionId);

      // Create WebRTC session if in webrtc or both mode
      if (streamMode === "webrtc" || streamMode === "both") {
        const webrtcSuccess = await webrtcManagerRef.current.createSession(
          data.sessionId
        );
        if (!webrtcSuccess) {
          console.warn(
            "WebRTC session creation failed, falling back to WebSocket"
          );
          if (streamMode === "webrtc") {
            setStreamMode("websocket");
          }
        }
      }

      return data.sessionId;
    } catch (err) {
      if (err instanceof PlayApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : "Failed to create session",
          isNetworkError: false,
        });
      }
      setStatus("Error");
      return null;
    }
  };

  const startEmulation = async () => {
    if (!sessionId) {
      const newSessionId = await createSession();
      if (!newSessionId) return;
      await startSession(newSessionId);
    } else {
      await startSession(sessionId);
    }
  };

  const startSession = async (sid: string) => {
    try {
      setStatus("Starting...");
      await startGameSession(sid);
      setStatus("Playing");
    } catch (err) {
      if (err instanceof PlayApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : "Failed to start emulation",
          isNetworkError: false,
        });
      }
      setStatus("Error");
    }
  };

  const stopEmulation = async () => {
    if (!sessionId) return;
    try {
      setStatus("Stopping...");
      await stopGameSession(sessionId);
      setSessionId(null);
      setStatus("Ready");
    } catch (err) {
      if (err instanceof PlayApiError) {
        setError({ message: err.message, isNetworkError: err.isNetworkError });
      } else {
        setError({
          message:
            err instanceof Error ? err.message : "Failed to stop emulation",
          isNetworkError: false,
        });
      }
    }
  };

  const isPlaying = status === "Playing";

  // Touch button component for cleaner code
  const TouchButton = ({
    button,
    children,
    className,
  }: {
    button: InputButton;
    children: React.ReactNode;
    className: string;
  }) => (
    <button
      onTouchStart={(e) => {
        e.preventDefault();
        sendInput(button, "down");
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        sendInput(button, "up");
      }}
      onMouseDown={() => sendInput(button, "down")}
      onMouseUp={() => sendInput(button, "up")}
      onMouseLeave={() => sendInput(button, "up")}
      className={className}
    >
      {children}
    </button>
  );

  // Mobile Fullscreen Game View
  if (isMobile && isFullscreen) {
    return (
      <div
        ref={gameContainerRef}
        className="fixed inset-0 bg-black flex items-center justify-center touch-none select-none"
      >
        {/* Game Canvas - Centered */}
        <div className="relative h-full aspect-3/2 max-w-full">
          <canvas
            ref={canvasRef}
            width={240}
            height={160}
            className="w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />

          {/* Scanline overlay */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px]" />
        </div>

        {/* Fullscreen Virtual Controls Overlay */}
        {showControls && (
          <>
            {/* Left Side - D-Pad */}
            <div className="absolute left-4 bottom-1/2 translate-y-1/2 md:left-8">
              <div className="relative w-32 h-32 md:w-40 md:h-40">
                <TouchButton
                  button="UP"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-t-xl flex items-center justify-center border border-slate-600/50"
                >
                  <svg
                    className="w-5 h-5 text-cyan-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 4l-8 8h16z" />
                  </svg>
                </TouchButton>
                <TouchButton
                  button="DOWN"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-b-xl flex items-center justify-center border border-slate-600/50"
                >
                  <svg
                    className="w-5 h-5 text-cyan-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 20l8-8H4z" />
                  </svg>
                </TouchButton>
                <TouchButton
                  button="LEFT"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-l-xl flex items-center justify-center border border-slate-600/50"
                >
                  <svg
                    className="w-5 h-5 text-cyan-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 12l8-8v16z" />
                  </svg>
                </TouchButton>
                <TouchButton
                  button="RIGHT"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-slate-800/80 active:bg-cyan-600 rounded-r-xl flex items-center justify-center border border-slate-600/50"
                >
                  <svg
                    className="w-5 h-5 text-cyan-400"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20 12l-8 8V4z" />
                  </svg>
                </TouchButton>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-slate-700/80 rounded-full border border-slate-600/50" />
              </div>
            </div>

            {/* Right Side - Action Buttons */}
            <div className="absolute right-4 bottom-1/2 translate-y-1/2 md:right-8">
              <div className="relative w-28 h-28 md:w-36 md:h-36">
                <TouchButton
                  button="B"
                  className="absolute left-0 bottom-0 w-12 h-12 md:w-14 md:h-14 bg-rose-600/90 active:bg-rose-500 rounded-full flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-rose-900/50 border-2 border-rose-400/30"
                >
                  B
                </TouchButton>
                <TouchButton
                  button="A"
                  className="absolute right-0 top-0 w-12 h-12 md:w-14 md:h-14 bg-fuchsia-600/90 active:bg-fuchsia-500 rounded-full flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-fuchsia-900/50 border-2 border-fuchsia-400/30"
                >
                  A
                </TouchButton>
              </div>
            </div>

            {/* Top Bar - L/R Shoulder + Menu */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-2 md:p-4">
              <TouchButton
                button="L"
                className="w-16 h-8 md:w-20 md:h-10 bg-slate-700/80 active:bg-purple-600 rounded-b-xl text-slate-300 font-bold text-sm border border-slate-600/50"
              >
                L
              </TouchButton>

              <div className="flex items-center gap-2">
                {/* Stream Mode Toggle */}
                <button
                  onClick={() =>
                    handleStreamModeChange(
                      streamMode === "websocket" ? "webrtc" : "websocket"
                    )
                  }
                  className={`p-2 rounded-lg flex items-center gap-1 ${
                    streamMode === "webrtc"
                      ? "bg-green-600/80 text-green-300"
                      : "bg-cyan-600/80 text-cyan-300"
                  }`}
                  title={`Mode: ${streamMode.toUpperCase()}`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {streamMode === "webrtc" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14M12 5l7 7-7 7"
                      />
                    )}
                  </svg>
                  <span className="text-[10px] font-bold">
                    {streamMode === "webrtc" ? "RTC" : "WS"}
                  </span>
                </button>

                <button
                  onClick={() => setShowControls(false)}
                  className="p-2 bg-slate-800/80 rounded-lg text-slate-400"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-slate-800/80 rounded-lg text-slate-400"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <TouchButton
                button="R"
                className="w-16 h-8 md:w-20 md:h-10 bg-slate-700/80 active:bg-purple-600 rounded-b-xl text-slate-300 font-bold text-sm border border-slate-600/50"
              >
                R
              </TouchButton>
            </div>

            {/* Bottom Center - START/SELECT */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
              <TouchButton
                button="SELECT"
                className="px-4 py-1.5 bg-slate-700/80 active:bg-slate-600 rounded-full text-slate-300 text-xs font-bold border border-slate-600/50"
              >
                SELECT
              </TouchButton>
              <TouchButton
                button="START"
                className="px-4 py-1.5 bg-emerald-600/80 active:bg-emerald-500 rounded-full text-white text-xs font-bold border border-emerald-400/30"
              >
                START
              </TouchButton>
            </div>
          </>
        )}

        {/* Hidden controls toggle */}
        {!showControls && (
          <button
            onClick={() => setShowControls(true)}
            className="absolute top-4 right-4 p-2 bg-slate-800/60 rounded-lg text-slate-400"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Regular Desktop/Tablet View
  return (
    <div
      ref={gameContainerRef}
      className={`bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 ${
        isMobile ? "h-dvh overflow-hidden flex flex-col" : "min-h-screen"
      }`}
    >
      {/* Animated Background - Hidden on mobile for performance */}
      {!isMobile && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          />
        </div>
      )}

      <div
        className={`relative mx-auto max-w-6xl ${
          isMobile
            ? " h-screen flex flex-col px-2 py-1.5 min-h-0"
            : "container px-4 py-4 md:py-8"
        }`}
      >
        {/* Header - Compact on mobile */}
        <div className={`shrink-0 ${isMobile ? "mb-1" : "mb-4 md:mb-8"}`}>
          <button
            onClick={() => navigate("/roms")}
            className={`group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors ${
              isMobile ? "hidden" : "mb-4 md:mb-6"
            }`}
          >
            <svg
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-mono text-sm">Back to Library</span>
          </button>

          {/* Hide badges on mobile, show compact info */}
          {isMobile ? (
            <div className="flex items-center justify-between">
              <h1 className="text-base font-bold text-white truncate flex-1 mr-2">
                {name}
              </h1>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  connected ? "bg-green-400" : "bg-red-400"
                }`}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2 md:mb-4">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono uppercase tracking-wider">
                  🎮 Now Playing
                </Badge>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 px-2 md:px-3 py-1 text-[10px] md:text-xs font-mono uppercase tracking-wider">
                  {desc}
                </Badge>
                <div className="flex items-center gap-2 ml-auto">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connected ? "bg-green-400 animate-pulse" : "bg-red-400"
                    }`}
                  />
                  <span
                    className={`text-[10px] md:text-xs font-mono ${
                      connected ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {connected ? "CONNECTED" : "OFFLINE"}
                  </span>
                </div>
              </div>

              <h1 className="text-2xl md:text-4xl font-black tracking-tight">
                <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {name}
                </span>
              </h1>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 md:mb-6 p-3 md:p-4 bg-red-950/50 border border-red-500/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">
                {error.isNetworkError ? "🔌" : "❌"}
              </span>
              <span className="text-red-400 font-bold text-sm">
                {error.isNetworkError ? "Erreur de connexion" : "Erreur"}
              </span>
            </div>
            <p className="text-red-300 text-xs md:text-sm font-mono">
              {error.message}
            </p>
            {error.isNetworkError && (
              <p className="text-slate-400 text-xs mt-2">
                Vérifiez que le serveur est démarré avec:{" "}
                <code className="bg-slate-800 px-1 rounded">
                  cd server && pnpm start:dev
                </code>
              </p>
            )}
          </div>
        )}

        {/* Main Content - Responsive Grid */}
        <div
          className={`${
            isMobile
              ? "flex-1 flex flex-col min-h-0 gap-1.5"
              : "grid lg:grid-cols-4 gap-4 md:gap-6"
          }`}
        >
          {/* Game Screen */}
          <div
            className={`lg:col-span-3 ${
              isMobile
                ? "flex flex-col min-h-0 w-full h-full z-10"
                : "space-y-4"
            }`}
          >
            <div
              className={`relative bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm overflow-hidden ${
                isMobile ? "shrink-0 rounded-lg" : "rounded-2xl"
              }`}
            >
              {/* Game Canvas Container */}
              <div className={isMobile ? "" : "p-3 md:p-6"}>
                <div className="relative bg-black rounded-xl overflow-hidden border-2 border-slate-800">
                  {/* Scanline Effect */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px] z-10" />

                  {/* Power LED */}
                  <div className="absolute top-2 right-2 md:top-3 md:right-3 z-20">
                    <span
                      className={`w-2 h-2 rounded-full block ${
                        isPlaying
                          ? "bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"
                          : "bg-slate-600"
                      }`}
                    />
                  </div>

                  <canvas
                    ref={canvasRef}
                    width={240}
                    height={160}
                    className="w-full h-auto block"
                    style={{ imageRendering: "pixelated" }}
                  />

                  {/* Play Overlay */}
                  {!isPlaying && (
                    <div
                      onClick={startEmulation}
                      className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-10 cursor-pointer"
                    >
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center mb-3 md:mb-4 hover:scale-110 transition-transform">
                        <svg
                          className="w-7 h-7 md:w-8 md:h-8 text-white ml-1"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <span className="text-white font-bold text-base md:text-lg tracking-wide">
                        PRESS START
                      </span>
                    </div>
                  )}
                </div>

                {/* Control Bar */}
                <div
                  className={`${
                    isMobile ? "mt-1.5" : "mt-3 md:mt-4"
                  } flex items-center justify-between gap-2 md:gap-4`}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`font-mono text-[9px] md:text-xs px-1.5 py-0.5 ${
                        isPlaying
                          ? "bg-green-500/20 text-green-300 border-green-500/50"
                          : status === "Error"
                          ? "bg-red-500/20 text-red-300 border-red-500/50"
                          : "bg-slate-500/20 text-slate-300 border-slate-500/50"
                      }`}
                    >
                      {status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex gap-1">
                    {/* Stream Mode Toggle - Mobile */}
                    {isMobile && (
                      <Button
                        onClick={() =>
                          handleStreamModeChange(
                            streamMode === "websocket" ? "webrtc" : "websocket"
                          )
                        }
                        disabled={isPlaying}
                        size="sm"
                        className={`font-bold px-1.5 py-1 rounded h-6 ${
                          streamMode === "webrtc"
                            ? "bg-green-600 hover:bg-green-500"
                            : "bg-cyan-600 hover:bg-cyan-500"
                        } text-white disabled:opacity-40`}
                        title={`Mode: ${streamMode.toUpperCase()}`}
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          {streamMode === "webrtc" ? (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                            />
                          ) : (
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 12h14M12 5l7 7-7 7"
                            />
                          )}
                        </svg>
                      </Button>
                    )}

                    {/* Fullscreen Button - Mobile */}
                    {isMobile && sessionId && (
                      <Button
                        onClick={toggleFullscreen}
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-1.5 py-1 rounded h-6"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                          />
                        </svg>
                      </Button>
                    )}

                    <Button
                      onClick={startEmulation}
                      disabled={!!sessionId}
                      size="sm"
                      className={`bg-green-600 hover:bg-green-500 text-white font-bold rounded disabled:opacity-40 ${
                        isMobile ? "px-1.5 py-1 h-6" : "px-3 md:px-4 py-2"
                      }`}
                    >
                      <svg
                        className={isMobile ? "w-3.5 h-3.5" : "w-4 h-4 md:mr-2"}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="hidden md:inline">START</span>
                    </Button>

                    <Button
                      onClick={stopEmulation}
                      disabled={!sessionId}
                      size="sm"
                      className={`bg-red-600 hover:bg-red-500 text-white font-bold rounded disabled:opacity-40 ${
                        isMobile ? "px-1.5 py-1 h-6" : "px-3 md:px-4 py-2"
                      }`}
                    >
                      <svg
                        className={isMobile ? "w-3 h-3" : "w-4 h-4 md:mr-2"}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                      </svg>
                      <span className="hidden md:inline">STOP</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Virtual Controller (Portrait Mode) */}
            {isMobile && sessionId && !isFullscreen && (
              <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg backdrop-blur-sm p-1.5 flex-1 min-h-0 flex flex-col justify-center">
                {/* L/R Buttons at top */}
                <div className="flex justify-between mb-1 shrink-0">
                  <TouchButton
                    button="L"
                    className="h-6 px-3 bg-slate-700 active:bg-purple-600 rounded text-[10px] font-bold text-slate-300"
                  >
                    L
                  </TouchButton>
                  <TouchButton
                    button="R"
                    className="h-6 px-3 bg-slate-700 active:bg-purple-600 rounded text-[10px] font-bold text-slate-300"
                  >
                    R
                  </TouchButton>
                </div>

                <div className="flex items-center justify-between flex-1 min-h-0 px-2">
                  {/* D-Pad */}
                  <div className="relative w-20 h-20">
                    <TouchButton
                      button="UP"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-t flex items-center justify-center"
                    >
                      <svg
                        className="w-2.5 h-2.5 text-cyan-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 4l-8 8h16z" />
                      </svg>
                    </TouchButton>
                    <TouchButton
                      button="DOWN"
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-b flex items-center justify-center"
                    >
                      <svg
                        className="w-2.5 h-2.5 text-cyan-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 20l8-8H4z" />
                      </svg>
                    </TouchButton>
                    <TouchButton
                      button="LEFT"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-l flex items-center justify-center"
                    >
                      <svg
                        className="w-2.5 h-2.5 text-cyan-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M4 12l8-8v16z" />
                      </svg>
                    </TouchButton>
                    <TouchButton
                      button="RIGHT"
                      className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-700 active:bg-cyan-600 rounded-r flex items-center justify-center"
                    >
                      <svg
                        className="w-3 h-3 text-cyan-300"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20 12l-8 8V4z" />
                      </svg>
                    </TouchButton>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-slate-600 rounded-full" />
                  </div>

                  {/* Center Buttons */}
                  <div className="flex flex-col gap-1">
                    <TouchButton
                      button="SELECT"
                      className="h-4 px-2 bg-slate-700 active:bg-slate-600 rounded-full text-[8px] font-bold text-slate-300"
                    >
                      SELECT
                    </TouchButton>
                    <TouchButton
                      button="START"
                      className="h-4 px-2 bg-emerald-600 active:bg-emerald-500 rounded-full text-[8px] font-bold text-white"
                    >
                      START
                    </TouchButton>
                  </div>

                  {/* Action Buttons */}
                  <div className="relative w-16 h-16">
                    <TouchButton
                      button="B"
                      className="absolute left-0 top-1/2 -translate-y-1/4 w-8 h-8 bg-rose-600 active:bg-rose-500 rounded-full font-black text-xs text-white flex items-center justify-center"
                    >
                      B
                    </TouchButton>
                    <TouchButton
                      button="A"
                      className="absolute right-0 top-1/2 -translate-y-3/4 w-8 h-8 bg-fuchsia-600 active:bg-fuchsia-500 rounded-full font-black text-xs text-white flex items-center justify-center"
                    >
                      A
                    </TouchButton>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Side Panel - Hidden on Mobile */}
          <div className="hidden lg:block space-y-4">
            {/* Controls Reference */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                    />
                  </svg>
                  CONTROLS
                </h3>
                <button
                  onClick={() => setShowControlsConfig(true)}
                  className="p-1.5 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-purple-300 transition-colors"
                  title="Configurer les commandes"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400 text-xs font-mono">
                    D-Pad
                  </span>
                  <div className="flex gap-1">
                    {(["UP", "DOWN", "LEFT", "RIGHT"] as const).map((btn) => (
                      <kbd
                        key={btn}
                        className="px-1.5 py-0.5 bg-slate-700 rounded text-cyan-400 text-xs font-mono"
                      >
                        {getKeyDisplayName(keyMappings[btn])}
                      </kbd>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400 text-xs font-mono">
                    A / B
                  </span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-fuchsia-600/50 rounded text-white text-xs font-mono">
                      {getKeyDisplayName(keyMappings.A)}
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-rose-600/50 rounded text-white text-xs font-mono">
                      {getKeyDisplayName(keyMappings.B)}
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400 text-xs font-mono">
                    L / R
                  </span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-xs font-mono">
                      {getKeyDisplayName(keyMappings.L)}
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 text-xs font-mono">
                      {getKeyDisplayName(keyMappings.R)}
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                  <span className="text-slate-400 text-xs font-mono">
                    Start / Select
                  </span>
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-emerald-600/50 rounded text-white text-xs font-mono">
                      {getKeyDisplayName(keyMappings.START)}
                    </kbd>
                    <kbd className="px-1.5 py-0.5 bg-slate-600/50 rounded text-white text-xs font-mono">
                      {getKeyDisplayName(keyMappings.SELECT)}
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Mode Selector */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur-sm p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
                STREAM MODE
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => handleStreamModeChange("websocket")}
                  disabled={isPlaying}
                  className={`w-full p-2 rounded-lg text-xs font-mono transition-all ${
                    streamMode === "websocket"
                      ? "bg-cyan-600/50 text-cyan-300 border border-cyan-500/50"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
                  } ${isPlaying ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span>WebSocket</span>
                    {streamMode === "websocket" && (
                      <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-left">
                    Standard latency, reliable
                  </p>
                </button>

                <button
                  onClick={() => handleStreamModeChange("webrtc")}
                  disabled={isPlaying}
                  className={`w-full p-2 rounded-lg text-xs font-mono transition-all ${
                    streamMode === "webrtc"
                      ? "bg-green-600/50 text-green-300 border border-green-500/50"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50"
                  } ${isPlaying ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span>WebRTC</span>
                    {streamMode === "webrtc" && (
                      <span className="w-2 h-2 bg-green-400 rounded-full" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-left">
                    Low latency, experimental
                  </p>
                </button>
              </div>
            </div>

            {/* Save States */}
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-2xl backdrop-blur-sm p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                SAVE STATES
              </h3>

              <div className="space-y-2">
                <button
                  onClick={() => setShowSaveStatesModal(true)}
                  disabled={!sessionId || !isPlaying}
                  className={`w-full p-2 rounded-lg text-xs font-mono transition-all ${
                    sessionId && isPlaying
                      ? "bg-amber-600/50 text-amber-300 border border-amber-500/50 hover:bg-amber-600/70"
                      : "bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                        />
                      </svg>
                      <span>Save / Load</span>
                    </div>
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 text-left">
                    {sessionId && isPlaying
                      ? "Manage save states"
                      : "Start game to use"}
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Hidden on Mobile */}
        {!isMobile && (
          <div className="mt-6 md:mt-8 text-center">
            <div className="inline-flex items-center gap-3 md:gap-4 px-3 md:px-4 py-2 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-full text-[10px] md:text-xs font-mono">
              <span className="text-slate-500">Status:</span>
              <span
                className={`font-bold ${
                  isPlaying ? "text-green-400" : "text-slate-400"
                }`}
              >
                {isPlaying ? "● PLAYING" : "○ IDLE"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Controls Configuration Dialog */}
      <ControlsConfigDialog
        open={showControlsConfig}
        onOpenChange={setShowControlsConfig}
        onMappingsChange={handleKeyMappingsChange}
      />

      {/* Save States Modal */}
      {sessionId && rom && (
        <SaveStatesModal
          isOpen={showSaveStatesModal}
          onClose={() => setShowSaveStatesModal(false)}
          romId={rom}
          romName={name || gameData?.name || "Game"}
          onSave={handleSaveState}
          onLoad={handleLoadState}
        />
      )}
    </div>
  );
}
