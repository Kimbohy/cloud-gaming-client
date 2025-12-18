import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryState } from "nuqs";

// API imports
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
} from "@/api/play.api";
import {
  WebRTCManager,
  WebRTCVideoRenderer,
  WebRTCAudioPlayer,
  setStreamMode as setServerStreamMode,
} from "@/api/webrtc.api";

// Components
import {
  GameCanvas,
  GameControlBar,
  GameError,
  GameHeader,
  GameFooter,
  MobileVirtualController,
  MobileFullscreenView,
  DesktopSidePanel,
} from "@/components/game";
import { ControlsConfigDialog } from "@/components/ControlsConfigDialog";
import { SaveStatesModal } from "@/components/SaveStatesModal";
// import { Button } from "@/components/ui/button";

// Hooks
import { useDevice, useFullscreen, useSaveStates } from "@/hooks";

interface ErrorState {
  message: string;
  isNetworkError: boolean;
}

export default function PlayPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Game data from route
  const gameData = location.state as {
    name: string;
    rom: string;
    desc: string;
  };
  const romId = location.pathname.split("/play/")[1];

  // Query state
  const [name, setName] = useQueryState("name");
  const [rom, setRom] = useQueryState("rom", { defaultValue: "" });
  const [desc, setDesc] = useQueryState("desc");

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [error, setError] = useState<ErrorState | null>(null);
  const [connected, setConnected] = useState(false);

  // Stream mode
  const [streamMode, setStreamMode] = useState<StreamMode>("websocket");

  // UI state
  const [showControls, setShowControls] = useState(true);
  const [showControlsConfig, setShowControlsConfig] = useState(false);
  const [showSaveStatesModal, setShowSaveStatesModal] = useState(false);
  const [showInlineSavePanel, setShowInlineSavePanel] = useState(false);
  const [keyMappings, setKeyMappings] = useState<KeyMappings>(loadKeyMappings);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const socketManagerRef = useRef<GameSocketManager>(new GameSocketManager());
  const audioManagerRef = useRef<GameAudioManager>(new GameAudioManager());
  const canvasManagerRef = useRef<GameCanvasManager>(new GameCanvasManager());
  const inputManagerRef = useRef<GameInputManager>(
    new GameInputManager(socketManagerRef.current)
  );
  const webrtcManagerRef = useRef<WebRTCManager>(new WebRTCManager());
  const webrtcVideoRendererRef = useRef<WebRTCVideoRenderer>(
    new WebRTCVideoRenderer()
  );
  const webrtcAudioPlayerRef = useRef<WebRTCAudioPlayer>(
    new WebRTCAudioPlayer()
  );

  // Custom hooks
  const { isMobile, isFullscreen } = useDevice(gameContainerRef);
  const { toggleFullscreen } = useFullscreen(
    gameContainerRef as RefObject<HTMLDivElement>
  );
  const {
    saveStates: inlineSaveStates,
    loading: inlineSaveLoading,
    loadSaveStates: loadInlineSaveStates,
    quickSave: handleInlineQuickSave,
    saveToSlot: handleInlineSaveToSlot,
    loadFromSlot: handleInlineLoadState,
  } = useSaveStates(romId);

  const isPlaying = status === "Playing";

  // Audio resume helper
  const resumeAudio = useCallback(() => {
    audioManagerRef.current.resume?.();
    webrtcAudioPlayerRef.current.resume();
  }, []);

  // Input handler
  const sendInput = useCallback(
    (button: InputButton, state: "down" | "up") => {
      if (!sessionId) return;

      resumeAudio();

      if (
        streamMode === "webrtc" &&
        webrtcManagerRef.current.isDataChannelReady()
      ) {
        webrtcManagerRef.current.sendInput(button, state);
      } else {
        socketManagerRef.current.sendInput(sessionId, button, state);
      }
    },
    [sessionId, streamMode, resumeAudio]
  );

  // Close inline save panel when exiting fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setShowInlineSavePanel(false);
    }
  }, [isFullscreen]);

  // Set game data from route
  useEffect(() => {
    if (gameData) {
      setName(gameData.name);
      setRom(gameData.rom);
      setDesc(gameData.desc);
    }
  }, [gameData, setName, setRom, setDesc]);

  // Initialize managers
  useEffect(() => {
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

    webrtcAudioPlayerRef.current.initialize();
    if (canvasRef.current) {
      webrtcVideoRendererRef.current.initialize(canvasRef.current);
    }

    const webrtcManager = webrtcManagerRef.current;
    webrtcManager.connect();

    webrtcManager.onVideoTrack((stream) => {
      webrtcVideoRendererRef.current.setVideoStream(stream);
    });

    webrtcManager.onAudioTrack((stream) => {
      webrtcAudioPlayerRef.current.setAudioStream(stream);
      webrtcAudioPlayerRef.current.resume();
    });

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
  }, []);

  // Reinitialize canvas on fullscreen change
  useEffect(() => {
    if (canvasRef.current) {
      canvasManagerRef.current.initialize(canvasRef.current);
      webrtcVideoRendererRef.current.initialize(canvasRef.current);
    }
  }, [isFullscreen]);

  // Setup keyboard controls
  useEffect(() => {
    inputManagerRef.current.setSessionId(sessionId);
    if (sessionId) {
      inputManagerRef.current.setupKeyboardControls();
    }
    return () => inputManagerRef.current.cleanup();
  }, [sessionId]);

  // Load save states when inline panel opens
  useEffect(() => {
    if (showInlineSavePanel) {
      loadInlineSaveStates();
    }
  }, [showInlineSavePanel, loadInlineSaveStates]);

  // Key mappings handler
  const handleKeyMappingsChange = useCallback((newMappings: KeyMappings) => {
    setKeyMappings(newMappings);
    inputManagerRef.current.updateKeyMappings(newMappings);
  }, []);

  // Session management
  const createSession = async () => {
    try {
      setError(null);
      setStatus("Creating...");
      const data = await createGameSession(rom, streamMode);
      setSessionId(data.sessionId);
      setStatus("Created");

      socketManagerRef.current.subscribeToSession(data.sessionId);

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

  const startEmulation = async () => {
    if (!sessionId) {
      const newSessionId = await createSession();
      if (!newSessionId) return;
      await startSession(newSessionId);
    } else {
      await startSession(sessionId);
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

  // Session ready helper
  const ensureSessionReady = useCallback(async (): Promise<string | null> => {
    let sid = sessionId;

    if (!sid) {
      sid = await createSession();
      if (!sid) return null;
    }

    if (!webrtcManagerRef.current.isSocketConnected()) {
      webrtcManagerRef.current.connect();
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    await webrtcManagerRef.current.createSession(sid);

    if (status !== "Playing") {
      await startSession(sid);
    }

    return sid;
  }, [sessionId, status]);

  // Array buffer to base64 helper
  const arrayBufferToBase64Safe = useCallback((buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const sub = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...sub);
    }
    return btoa(binary);
  }, []);

  // Save state handlers
  const handleSaveState = useCallback(async (): Promise<{
    stateData: string;
    thumbnail: string | null;
  } | null> => {
    const sid = await ensureSessionReady();
    if (!sid) {
      console.error("[PlayPage] No session available for save");
      return null;
    }

    return new Promise((resolve) => {
      webrtcManagerRef.current.saveState(sid, (result) => {
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
  }, [ensureSessionReady]);

  const handleLoadState = useCallback(
    async (stateData: ArrayBuffer): Promise<boolean> => {
      const sid = await ensureSessionReady();
      if (!sid) return false;

      const base64 = arrayBufferToBase64Safe(stateData);

      return new Promise((resolve) => {
        webrtcManagerRef.current.loadState(sid, base64, (result) => {
          resolve(result.success);
        });
      });
    },
    [ensureSessionReady, arrayBufferToBase64Safe]
  );

  // Stream mode handler
  const handleStreamModeChange = useCallback(
    async (newMode: StreamMode) => {
      setStreamMode(newMode);
      if (sessionId) {
        const result = await setServerStreamMode(sessionId, newMode);
        if (!result.success) {
          console.error("Failed to change stream mode:", result.error);
          return;
        }

        if (newMode === "webrtc" || newMode === "both") {
          if (!webrtcManagerRef.current.isSocketConnected()) {
            webrtcManagerRef.current.connect();
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          const webrtcSuccess = await webrtcManagerRef.current.createSession(
            sessionId
          );
          if (!webrtcSuccess) {
            console.warn("WebRTC session creation failed during mode switch");
          }
        }
      }
    },
    [sessionId]
  );

  // Single container that stays in the DOM - content changes based on fullscreen state
  return (
    <div
      ref={gameContainerRef}
      className={
        isMobile && isFullscreen
          ? "fixed inset-0 bg-black flex items-center justify-center touch-none select-none"
          : `bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 ${
              isMobile
                ? "h-dvh w-full overflow-x-hidden overflow-y-auto flex flex-col"
                : "min-h-screen"
            }`
      }
    >
      {/* Mobile Fullscreen Content */}
      {isMobile && isFullscreen ? (
        <>
          <div className="relative h-full aspect-3/2 max-w-full">
            <canvas
              ref={canvasRef}
              width={240}
              height={160}
              className="w-full h-full"
              style={{ imageRendering: "pixelated" }}
            />
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px]" />
          </div>

          {showControls && (
            <MobileFullscreenView
              showControls={showControls}
              showInlineSavePanel={showInlineSavePanel}
              streamMode={streamMode}
              hasRom={!!rom}
              saveStates={inlineSaveStates}
              saveLoading={inlineSaveLoading}
              onInput={sendInput}
              onToggleControls={setShowControls}
              onToggleFullscreen={toggleFullscreen}
              onToggleInlineSavePanel={() =>
                setShowInlineSavePanel(!showInlineSavePanel)
              }
              onStreamModeChange={() =>
                handleStreamModeChange(
                  streamMode === "websocket" ? "webrtc" : "websocket"
                )
              }
              onQuickSave={() => handleInlineQuickSave(handleSaveState)}
              onLoadState={(state) =>
                handleInlineLoadState(state, handleLoadState)
              }
              onSaveToSlot={(slot) =>
                handleInlineSaveToSlot(slot, handleSaveState)
              }
            />
          )}

          {/* Tap to toggle controls */}
          {!showControls && (
            <button
              className="absolute inset-0 z-10"
              onClick={() => setShowControls(true)}
              aria-label="Show controls"
            />
          )}
        </>
      ) : (
        <>
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
            className={`relative mx-auto ${
              isMobile
                ? "w-full flex flex-col px-3 py-4"
                : "container max-w-6xl px-4 py-4 md:py-8"
            }`}
          >
            {/* Header */}
            <div
              className={`shrink-0 w-full ${
                isMobile ? "mb-3" : "mb-4 md:mb-8"
              }`}
            >
              <GameHeader
                name={name || undefined}
                desc={desc || undefined}
                connected={connected}
                isMobile={isMobile}
                onBack={() => navigate("/roms")}
              />
            </div>

            {/* Error */}
            {error && <GameError error={error} />}

            {/* Main Content */}
            <div
              className={`${
                isMobile
                  ? "flex flex-col gap-2 w-full"
                  : "grid lg:grid-cols-4 gap-4 md:gap-6"
              }`}
            >
              {/* Game Screen */}
              <div
                className={`lg:col-span-3 ${
                  isMobile ? "flex flex-col w-full z-10" : "space-y-4"
                }`}
              >
                <div
                  className={`relative bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm overflow-hidden ${
                    isMobile ? "shrink-0 rounded-lg p-1.5 pb-2" : "rounded-2xl"
                  }`}
                >
                  <GameCanvas
                    ref={canvasRef}
                    isPlaying={isPlaying}
                    isMobile={isMobile}
                    onStartGame={startEmulation}
                  />

                  {/* Control Bar */}
                  <div
                    className={
                      isMobile ? "px-1.5" : "px-3 md:px-6 pb-3 md:pb-6"
                    }
                  >
                    <GameControlBar
                      status={status}
                      isPlaying={isPlaying}
                      sessionId={sessionId}
                      streamMode={streamMode}
                      isMobile={isMobile}
                      rom={rom}
                      onStart={startEmulation}
                      onStop={stopEmulation}
                      onToggleFullscreen={toggleFullscreen}
                      onStreamModeChange={handleStreamModeChange}
                      onOpenSaveStates={() => setShowSaveStatesModal(true)}
                    />
                  </div>
                </div>

                {/* Mobile Virtual Controller */}
                {isMobile && sessionId && (
                  <MobileVirtualController onInput={sendInput} />
                )}
              </div>

              {/* Side Panel - Desktop Only */}
              <DesktopSidePanel
                keyMappings={keyMappings}
                streamMode={streamMode}
                isPlaying={isPlaying}
                hasRom={!!rom}
                onOpenControlsConfig={() => setShowControlsConfig(true)}
                onStreamModeChange={handleStreamModeChange}
                onOpenSaveStates={() => setShowSaveStatesModal(true)}
              />
            </div>

            {/* Footer - Desktop Only */}
            {!isMobile && <GameFooter isPlaying={isPlaying} />}
          </div>

          {/* Controls Configuration Dialog */}
          <ControlsConfigDialog
            open={showControlsConfig}
            onOpenChange={setShowControlsConfig}
            onMappingsChange={handleKeyMappingsChange}
          />

          {/* Save States Modal */}
          {rom && (
            <SaveStatesModal
              isOpen={showSaveStatesModal}
              onClose={() => setShowSaveStatesModal(false)}
              romId={romId}
              romName={name || gameData?.name || "Game"}
              onSave={handleSaveState}
              onLoad={handleLoadState}
            />
          )}
        </>
      )}
    </div>
  );
}
