import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createGameSession,
  startGameSession,
  stopGameSession,
  GameSocketManager,
  GameAudioManager,
  GameCanvasManager,
  GameInputManager,
} from "@/lib/play.api";

// Correct ROM path (no /rom/ subdirectory)
const ROM_PATH = import.meta.env.VITE_ROM_PATH;

export default function PlayPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Not started");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketManagerRef = useRef<GameSocketManager>(new GameSocketManager());
  const audioManagerRef = useRef<GameAudioManager>(new GameAudioManager());
  const canvasManagerRef = useRef<GameCanvasManager>(new GameCanvasManager());
  const inputManagerRef = useRef<GameInputManager>(
    new GameInputManager(socketManagerRef.current)
  );

  useEffect(() => {
    // Initialize managers
    audioManagerRef.current.initialize();

    if (canvasRef.current) {
      canvasManagerRef.current.initialize(canvasRef.current);
    }

    // Setup WebSocket
    const socketManager = socketManagerRef.current;
    socketManager.connect();

    socketManager.onConnect(() => {
      setConnected(true);
      audioManagerRef.current.resume();
    });

    socketManager.onDisconnect(() => {
      setConnected(false);
    });

    socketManager.onFrame((data) => {
      canvasManagerRef.current.renderFrame(data);
    });

    socketManager.onAudio((data) => {
      audioManagerRef.current.playAudio(data);
    });

    return () => {
      socketManager.disconnect();
      audioManagerRef.current.cleanup();
      inputManagerRef.current.cleanup();
    };
  }, []);

  useEffect(() => {
    // Setup keyboard controls
    inputManagerRef.current.setSessionId(sessionId);

    if (sessionId) {
      inputManagerRef.current.setupKeyboardControls();
    }

    return () => {
      inputManagerRef.current.cleanup();
    };
  }, [sessionId]);

  const createSession = async () => {
    try {
      setError(null);
      setStatus("Creating session...");

      const data = await createGameSession(ROM_PATH);
      setSessionId(data.sessionId);
      setStatus("Session created");

      // Subscribe to session updates via WebSocket
      socketManagerRef.current.subscribeToSession(data.sessionId);

      return data.sessionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
      setStatus("Error");
      return null;
    }
  };

  const startEmulation = async () => {
    if (!sessionId) {
      const newSessionId = await createSession();
      if (!newSessionId) return;

      // Use the newly created session ID
      await startSession(newSessionId);
    } else {
      await startSession(sessionId);
    }
  };

  const startSession = async (sid: string) => {
    try {
      setStatus("Starting emulation...");
      await startGameSession(sid);
      setStatus("Emulation running");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start emulation"
      );
      setStatus("Error");
    }
  };

  const stopEmulation = async () => {
    if (!sessionId) return;

    try {
      setStatus("Stopping emulation...");
      await stopGameSession(sessionId);
      setSessionId(null);
      setStatus("Stopped");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop emulation");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="relative container mx-auto px-4 py-12 max-w-7xl">
        {/* Gaming Header */}
        <div className="mb-12 text-center">
          <div className="inline-block mb-4">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-4 py-1 text-sm font-mono uppercase tracking-wider">
              🎮 Now Playing
            </Badge>
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
            <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              CLOUD
            </span>
            <br />
            <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              GAMING
            </span>
          </h1>
          <p className="text-slate-400 text-lg font-medium tracking-wide">
            Kirby & The Amazing Mirror
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-8">
            <Alert
              variant="error"
              className="bg-red-950/50 border-red-500/50 backdrop-blur-sm"
            >
              <AlertDescription className="text-red-300">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Game Container */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Canvas and Controls - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Game Screen */}
            <Card className="relative overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              {/* Glowing Border Effect */}
              <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-20 blur-xl -z-10" />

              <CardContent className="p-6">
                <div className="relative bg-black rounded-lg overflow-hidden border-2 border-slate-700/50 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  {/* Scanline Effect */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px] z-10" />

                  <canvas
                    ref={canvasRef}
                    width={240}
                    height={160}
                    className="w-full h-auto"
                    style={{
                      imageRendering: "pixelated",
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Control Buttons */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex gap-3 flex-wrap justify-center">
                  <Button
                    onClick={startEmulation}
                    disabled={!!sessionId}
                    className="bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold px-8 py-6 text-lg shadow-[0_0_20px_rgba(34,197,94,0.5)] disabled:opacity-50 disabled:shadow-none"
                  >
                    ▶ START GAME
                  </Button>
                  <Button
                    onClick={stopEmulation}
                    disabled={!sessionId}
                    className="bg-linear-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-bold px-8 py-6 text-lg shadow-[0_0_20px_rgba(239,68,68,0.5)] disabled:opacity-50 disabled:shadow-none"
                  >
                    ■ STOP GAME
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Virtual Gamepad - Test Controls */}
            {sessionId && (
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <CardTitle className="text-cyan-400 font-bold mb-4 text-center font-mono uppercase tracking-wider">
                    Virtual Gamepad
                  </CardTitle>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("UP")
                      }
                      disabled={!sessionId}
                      className="bg-slate-800 hover:bg-slate-700 border border-cyan-500/50 text-cyan-400 font-bold"
                      size="sm"
                    >
                      ↑
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("DOWN")
                      }
                      disabled={!sessionId}
                      className="bg-slate-800 hover:bg-slate-700 border border-cyan-500/50 text-cyan-400 font-bold"
                      size="sm"
                    >
                      ↓
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("LEFT")
                      }
                      disabled={!sessionId}
                      className="bg-slate-800 hover:bg-slate-700 border border-cyan-500/50 text-cyan-400 font-bold"
                      size="sm"
                    >
                      ←
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("RIGHT")
                      }
                      disabled={!sessionId}
                      className="bg-slate-800 hover:bg-slate-700 border border-cyan-500/50 text-cyan-400 font-bold"
                      size="sm"
                    >
                      →
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("A")
                      }
                      disabled={!sessionId}
                      className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-purple-300 font-bold"
                      size="sm"
                    >
                      A
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("B")
                      }
                      disabled={!sessionId}
                      className="bg-purple-800 hover:bg-purple-700 border border-purple-500/50 text-purple-300 font-bold"
                      size="sm"
                    >
                      B
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("START")
                      }
                      disabled={!sessionId}
                      className="bg-green-800 hover:bg-green-700 border border-green-500/50 text-green-300 font-bold"
                      size="sm"
                    >
                      START
                    </Button>
                    <Button
                      onClick={() =>
                        inputManagerRef.current.sendButtonPress("SELECT")
                      }
                      disabled={!sessionId}
                      className="bg-green-800 hover:bg-green-700 border border-green-500/50 text-green-300 font-bold"
                      size="sm"
                    >
                      SELECT
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Info Panel - Right Side */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6 space-y-4">
                <CardTitle className="text-purple-400 font-bold mb-4 font-mono uppercase tracking-wider">
                  Session Info
                </CardTitle>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 font-mono text-sm">
                      Status:
                    </span>
                    <Badge
                      className={`font-bold ${
                        status === "Emulation running"
                          ? "bg-green-500/20 text-green-300 border-green-500/50"
                          : status === "Error"
                          ? "bg-red-500/20 text-red-300 border-red-500/50"
                          : "bg-yellow-500/20 text-yellow-300 border-yellow-500/50"
                      }`}
                    >
                      {status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <span className="text-slate-400 font-mono text-sm">
                      Connection:
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full animate-pulse ${
                          connected ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                      <span
                        className={`font-bold text-sm ${
                          connected ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {connected ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  </div>

                  {sessionId && (
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <span className="text-slate-400 font-mono text-xs block mb-1">
                        Session ID:
                      </span>
                      <code className="text-cyan-400 text-xs break-all">
                        {sessionId}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Controls Guide */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <CardTitle className="text-pink-400 font-bold mb-4 font-mono uppercase tracking-wider">
                  Keyboard Controls
                </CardTitle>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-slate-800/50 rounded border border-slate-700/30">
                    <span className="text-slate-300 font-mono text-sm">
                      Arrow Keys
                    </span>
                    <span className="text-cyan-400 text-sm font-bold">
                      D-Pad
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800/50 rounded border border-slate-700/30">
                    <span className="text-slate-300 font-mono text-sm">
                      Z / X
                    </span>
                    <span className="text-purple-400 text-sm font-bold">
                      A / B
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800/50 rounded border border-slate-700/30">
                    <span className="text-slate-300 font-mono text-sm">
                      A / S
                    </span>
                    <span className="text-purple-400 text-sm font-bold">
                      L / R
                    </span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-800/50 rounded border border-slate-700/30">
                    <span className="text-slate-300 font-mono text-sm">
                      Enter / Shift
                    </span>
                    <span className="text-green-400 text-sm font-bold">
                      Start / Select
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
