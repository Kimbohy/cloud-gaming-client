import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useParams, useLocation } from "react-router-dom";
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

  const gameData = location.state as {
    name: string;
    rom: string;
    desc: string;
  };

  const [name, setName] = useQueryState("name");
  const [rom, setRom] = useQueryState("rom", { defaultValue: "" });
  const [desc, setDesc] = useQueryState("desc");

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
    if (gameData) {
      setName(gameData.name);
      setRom(gameData.rom);
      setDesc(gameData.desc);
    }
  }, [gameData]);

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

      const data = await createGameSession(rom);
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
          <div className="flex gap-2 items-center justify-center mb-4">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 px-4 py-1 text-sm font-mono uppercase tracking-wider">
              🎮 Now Playing
            </Badge>
            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 px-4 py-1 text-sm font-mono uppercase tracking-wider">
              {desc}
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight px-4">
            <span className="bg-linear-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]">
              {name}
            </span>
          </h1>
          <p className="text-slate-400 text-sm font-mono tracking-wide">
            Game ID: {id} • ROM: {rom.split("/").pop()}
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
            {/* Game Screen with Overlay Controls */}
            <div className="relative">
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

              {/* Virtual Gamepad Overlay - Only visible when session is active */}
              {sessionId && (
                <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-center pb-8">
                  <div className="pointer-events-auto bg-slate-900/80 backdrop-blur-md rounded-2xl p-6 border-2 border-slate-700/50 shadow-2xl max-w-2xl w-full mx-4">
                    <div className="flex items-center justify-between gap-8">
                      {/* D-Pad Section */}
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-slate-400 mb-2 font-mono">
                          D-PAD
                        </p>
                        <div className="relative w-28 h-28">
                          {/* Up Button */}
                          <Button
                            onClick={() =>
                              inputManagerRef.current.sendButtonPress("UP")
                            }
                            disabled={!sessionId}
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 border-2 border-slate-600 hover:border-cyan-500 rounded-t-lg shadow-lg transition-all active:scale-95 p-0"
                            size="sm"
                          >
                            <span className="text-cyan-400 hover:text-white font-bold text-lg">
                              ↑
                            </span>
                          </Button>

                          {/* Down Button */}
                          <Button
                            onClick={() =>
                              inputManagerRef.current.sendButtonPress("DOWN")
                            }
                            disabled={!sessionId}
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 border-2 border-slate-600 hover:border-cyan-500 rounded-b-lg shadow-lg transition-all active:scale-95 p-0"
                            size="sm"
                          >
                            <span className="text-cyan-400 hover:text-white font-bold text-lg">
                              ↓
                            </span>
                          </Button>

                          {/* Left Button */}
                          <Button
                            onClick={() =>
                              inputManagerRef.current.sendButtonPress("LEFT")
                            }
                            disabled={!sessionId}
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 border-2 border-slate-600 hover:border-cyan-500 rounded-l-lg shadow-lg transition-all active:scale-95 p-0"
                            size="sm"
                          >
                            <span className="text-cyan-400 hover:text-white font-bold text-lg">
                              ←
                            </span>
                          </Button>

                          {/* Right Button */}
                          <Button
                            onClick={() =>
                              inputManagerRef.current.sendButtonPress("RIGHT")
                            }
                            disabled={!sessionId}
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-700 hover:bg-cyan-600 border-2 border-slate-600 hover:border-cyan-500 rounded-r-lg shadow-lg transition-all active:scale-95 p-0"
                            size="sm"
                          >
                            <span className="text-cyan-400 hover:text-white font-bold text-lg">
                              →
                            </span>
                          </Button>

                          {/* Center */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-slate-600 rounded-full border-2 border-slate-500" />
                        </div>
                      </div>

                      {/* Center Buttons */}
                      <div className="flex flex-col items-center gap-2">
                        <Button
                          onClick={() =>
                            inputManagerRef.current.sendButtonPress("SELECT")
                          }
                          disabled={!sessionId}
                          className="px-5 py-1.5 bg-slate-700 hover:bg-slate-600 border-2 border-slate-600 rounded-full shadow-lg transition-all active:scale-95"
                          size="sm"
                        >
                          <span className="text-slate-300 hover:text-white font-bold text-xs">
                            SELECT
                          </span>
                        </Button>

                        <Button
                          onClick={() =>
                            inputManagerRef.current.sendButtonPress("START")
                          }
                          disabled={!sessionId}
                          className="px-5 py-1.5 bg-green-600 hover:bg-green-500 border-2 border-green-400 rounded-full shadow-lg transition-all active:scale-95"
                          size="sm"
                        >
                          <span className="text-white font-bold text-xs">
                            START
                          </span>
                        </Button>
                      </div>

                      {/* Action Buttons Section */}
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-slate-400 mb-2 font-mono">
                          ACTIONS
                        </p>
                        <div className="relative w-28 h-28">
                          {/* B Button (Left) */}
                          <Button
                            onClick={() =>
                              inputManagerRef.current.sendButtonPress("B")
                            }
                            disabled={!sessionId}
                            className="absolute left-1 top-1/2 -translate-y-1/2 w-11 h-11 bg-purple-600 hover:bg-purple-500 border-2 border-purple-400 rounded-full shadow-lg transition-all active:scale-95 p-0"
                            size="sm"
                          >
                            <span className="text-white font-black text-base">
                              B
                            </span>
                          </Button>

                          {/* A Button (Right) */}
                          <Button
                            onClick={() =>
                              inputManagerRef.current.sendButtonPress("A")
                            }
                            disabled={!sessionId}
                            className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 bg-purple-600 hover:bg-purple-500 border-2 border-purple-400 rounded-full shadow-lg transition-all active:scale-95 p-0"
                            size="sm"
                          >
                            <span className="text-white font-black text-base">
                              A
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

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

            {/* Controls Guide - Game Boy Style */}
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <CardTitle className="text-pink-400 font-bold mb-6 font-mono uppercase tracking-wider text-center">
                  Controller Layout
                </CardTitle>

                {/* Gamepad Visual */}
                <div className="relative bg-slate-800/70 rounded-2xl p-8 border-2 border-slate-700/50 shadow-inner">
                  {/* D-Pad (Left Side) */}
                  <div className="absolute left-8 top-1/2 -translate-y-1/2">
                    <div className="relative w-24 h-24">
                      {/* D-Pad Cross */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-24 h-24">
                          {/* Vertical bar */}
                          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-8 h-24 bg-slate-700 rounded-sm shadow-lg" />
                          {/* Horizontal bar */}
                          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-24 h-8 bg-slate-700 rounded-sm shadow-lg" />
                          {/* Center circle */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-slate-600 rounded-full border-2 border-slate-500" />

                          {/* Direction Labels */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-6 text-cyan-400 text-xs font-bold">
                            ↑
                          </div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-cyan-400 text-xs font-bold">
                            ↓
                          </div>
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 text-cyan-400 text-xs font-bold">
                            ←
                          </div>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 text-cyan-400 text-xs font-bold">
                            →
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-center text-slate-400 mt-4 font-mono">
                      ARROW KEYS
                    </p>
                  </div>

                  {/* Action Buttons (Right Side) */}
                  <div className="absolute right-8 top-1/2 -translate-y-1/2">
                    <div className="relative w-24 h-24">
                      {/* B Button (Left) */}
                      <div className="absolute left-0 top-1/2 -translate-y-1/2">
                        <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-purple-400 shadow-lg flex items-center justify-center">
                          <span className="text-white font-black text-sm">
                            B
                          </span>
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-1 font-mono">
                          X
                        </p>
                      </div>

                      {/* A Button (Right) */}
                      <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-purple-400 shadow-lg flex items-center justify-center">
                          <span className="text-white font-black text-sm">
                            A
                          </span>
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-1 font-mono">
                          Z
                        </p>
                      </div>

                      {/* Y Button (Top) */}
                      <div className="absolute left-1/2 top-0 -translate-x-1/2">
                        <div className="w-10 h-10 rounded-full bg-purple-700 border-2 border-purple-500 shadow-lg flex items-center justify-center opacity-50">
                          <span className="text-white font-black text-sm">
                            L
                          </span>
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-1 font-mono">
                          A
                        </p>
                      </div>

                      {/* X Button (Bottom) */}
                      <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
                        <div className="w-10 h-10 rounded-full bg-purple-700 border-2 border-purple-500 shadow-lg flex items-center justify-center opacity-50">
                          <span className="text-white font-black text-sm">
                            R
                          </span>
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-1 font-mono">
                          S
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Center Space for Start/Select */}
                  <div className="pt-32 pb-4 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-4">
                      {/* Select Button */}
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-6 rounded-full bg-slate-700 border-2 border-slate-600 shadow-inner flex items-center justify-center">
                          <span className="text-slate-400 font-bold text-xs">
                            SELECT
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          SHIFT
                        </p>
                      </div>

                      {/* Start Button */}
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-6 rounded-full bg-green-700 border-2 border-green-500 shadow-lg flex items-center justify-center">
                          <span className="text-white font-bold text-xs">
                            START
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                          ENTER
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <p className="text-xs text-slate-400 text-center font-mono">
                    Press keys to control the game • Keyboard only
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
