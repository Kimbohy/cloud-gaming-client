import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  createGameSession,
  startGameSession,
  stopGameSession,
  GameSocketManager,
  GameAudioManager,
  GameCanvasManager,
  GameInputManager,
} from "@/lib/play.api";
import { useQueryState } from "nuqs";

export default function PlayPage() {
  const { id } = useParams();
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
    if (gameData) {
      setName(gameData.name);
      setRom(gameData.rom);
      setDesc(gameData.desc);
    }
  }, [gameData]);

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
      setStatus("Creating...");

      const data = await createGameSession(rom);
      setSessionId(data.sessionId);
      setStatus("Created");

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
      setError(
        err instanceof Error ? err.message : "Failed to start emulation"
      );
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
      setError(err instanceof Error ? err.message : "Failed to stop emulation");
    }
  };

  const isPlaying = status === "Playing";

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

      <div className="relative container mx-auto px-4 py-8 max-w-6xl">
        {/* Header with Back Button */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/roms")}
            className="group inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
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

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-3 py-1 text-xs font-mono uppercase tracking-wider">
              🎮 Now Playing
            </Badge>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 px-3 py-1 text-xs font-mono uppercase tracking-wider">
              {desc}
            </Badge>
            <div className="flex items-center gap-2 ml-auto">
              <span
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-green-400 animate-pulse" : "bg-red-400"
                }`}
              />
              <span
                className={`text-xs font-mono ${
                  connected ? "text-green-400" : "text-red-400"
                }`}
              >
                {connected ? "CONNECTED" : "OFFLINE"}
              </span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {name}
            </span>
          </h1>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-500/50 rounded-xl backdrop-blur-sm">
            <p className="text-red-300 text-sm font-mono">{error}</p>
          </div>
        )}

        {/* Main Game Area */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Screen - Takes more space */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="group relative overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-sm transition-all duration-500 hover:shadow-[0_0_50px_rgba(168,85,247,0.3)]">
              {/* Glowing Border on Hover */}
              <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl -z-10" />

              <CardContent className="p-4 md:p-6">
                {/* Game Screen Container */}
                <div className="relative bg-black rounded-xl overflow-hidden border-2 border-slate-800 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]">
                  {/* Screen Bezel Effect */}
                  <div className="absolute inset-0 rounded-xl border-4 border-slate-900/50 pointer-events-none z-20" />

                  {/* Scanline Effect */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-size-[100%_4px] z-10" />

                  {/* Power LED */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full transition-colors ${
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
                    style={{
                      imageRendering: "pixelated",
                    }}
                  />

                  {/* Overlay when not playing */}
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-10">
                      <div
                        className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center mb-4"
                        onClick={startEmulation}
                      >
                        <svg
                          className="w-8 h-8 text-white ml-1"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <span className="text-white font-bold text-lg tracking-wide">
                        PRESS START
                      </span>
                      <span className="text-slate-400 font-mono text-xs mt-1">
                        to begin playing
                      </span>
                    </div>
                  )}
                </div>

                {/* Control Bar */}
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`font-mono text-xs ${
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

                  <div className="flex gap-2">
                    <Button
                      onClick={startEmulation}
                      disabled={!!sessionId}
                      size="sm"
                      className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      START
                    </Button>
                    <Button
                      onClick={stopEmulation}
                      disabled={!sessionId}
                      size="sm"
                      className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="1" />
                      </svg>
                      STOP
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Virtual Controller - Mobile/Touch */}
            {sessionId && (
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm lg:hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* D-Pad */}
                    <div className="relative w-28 h-28">
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("UP")
                        }
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 rounded-t-lg p-0"
                      >
                        <svg
                          className="w-4 h-4 text-cyan-300"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 4l-8 8h16z" />
                        </svg>
                      </Button>
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("DOWN")
                        }
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 rounded-b-lg p-0"
                      >
                        <svg
                          className="w-4 h-4 text-cyan-300"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 20l8-8H4z" />
                        </svg>
                      </Button>
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("LEFT")
                        }
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 rounded-l-lg p-0"
                      >
                        <svg
                          className="w-4 h-4 text-cyan-300"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4 12l8-8v16z" />
                        </svg>
                      </Button>
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("RIGHT")
                        }
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 rounded-r-lg p-0"
                      >
                        <svg
                          className="w-4 h-4 text-cyan-300"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 12l-8 8V4z" />
                        </svg>
                      </Button>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-600 rounded-full" />
                    </div>

                    {/* Center Buttons */}
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("SELECT")
                        }
                        className="h-6 px-3 bg-slate-700 hover:bg-slate-600 rounded-full text-[10px] font-bold"
                      >
                        SELECT
                      </Button>
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("START")
                        }
                        className="h-6 px-3 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[10px] font-bold"
                      >
                        START
                      </Button>
                    </div>

                    {/* Action Buttons */}
                    <div className="relative w-24 h-24">
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("B")
                        }
                        className="absolute left-0 top-1/2 -translate-y-1/4 w-10 h-10 bg-rose-600 hover:bg-rose-500 rounded-full p-0 font-black"
                      >
                        B
                      </Button>
                      <Button
                        onClick={() =>
                          inputManagerRef.current.sendButtonPress("A")
                        }
                        className="absolute right-0 top-1/2 -translate-y-3/4 w-10 h-10 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full p-0 font-black"
                      >
                        A
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Controls Reference */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
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

                <div className="space-y-3">
                  {/* D-Pad */}
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs font-mono">
                      D-Pad
                    </span>
                    <div className="flex gap-1">
                      {["↑", "↓", "←", "→"].map((key, i) => (
                        <kbd
                          key={i}
                          className="px-2 py-1 bg-slate-700 rounded text-cyan-400 text-xs font-mono"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>

                  {/* A/B */}
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs font-mono">
                      A / B
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-fuchsia-600/50 rounded text-white text-xs font-mono">
                        Z
                      </kbd>
                      <kbd className="px-2 py-1 bg-rose-600/50 rounded text-white text-xs font-mono">
                        X
                      </kbd>
                    </div>
                  </div>

                  {/* L/R */}
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs font-mono">
                      L / R
                    </span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-xs font-mono">
                        A
                      </kbd>
                      <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-xs font-mono">
                        S
                      </kbd>
                    </div>
                  </div>

                  {/* Start/Select */}
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs font-mono">
                      Start
                    </span>
                    <kbd className="px-2 py-1 bg-emerald-600/50 rounded text-white text-xs font-mono">
                      Enter
                    </kbd>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                    <span className="text-slate-400 text-xs font-mono">
                      Select
                    </span>
                    <kbd className="px-2 py-1 bg-slate-700 rounded text-slate-300 text-xs font-mono">
                      Shift
                    </kbd>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Session Info */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-cyan-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  SESSION
                </h3>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>Game ID</span>
                    <span className="text-white">{id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>ROM</span>
                    <span className="text-white truncate max-w-[120px]">
                      {rom.split("/").pop()?.split(".")[0]}
                    </span>
                  </div>
                  {sessionId && (
                    <div className="pt-2 border-t border-slate-700/50">
                      <span className="text-slate-500 block mb-1">
                        Session ID
                      </span>
                      <code className="text-cyan-400 text-[10px] break-all">
                        {sessionId}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <div className="p-4 bg-slate-900/30 border border-slate-700/30 rounded-xl">
              <p className="text-slate-500 text-xs font-mono text-center">
                💡 Use keyboard for best experience
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-4 px-4 py-2 bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-full text-xs font-mono">
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
      </div>
    </div>
  );
}
