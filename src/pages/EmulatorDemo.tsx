import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { io, Socket } from "socket.io-client";

// Correct ROM path (no /rom/ subdirectory)
const ROM_PATH = import.meta.env.VITE_ROM_PATH;

export default function EmulatorDemo() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Not started");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  useEffect(() => {
    // Initialize Web Audio API
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContextClass();

    console.log("Audio Context initialized:", {
      sampleRate: audioContextRef.current.sampleRate,
      state: audioContextRef.current.state,
    });

    // Connect to WebSocket
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://192.168.57.10:3000";
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected");
      setConnected(true);

      // Resume audio context on user interaction
      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected");
      setConnected(false);
    });

    socket.on("frame", (data) => {
      // Draw frame to canvas
      renderFrame(data);
    });

    socket.on("audio", (data) => {
      // Play audio
      playAudio(data);
    });

    return () => {
      socket.disconnect();

      // Clean up audio
      audioBufferQueueRef.current.forEach((node) => {
        try {
          node.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      });
      audioBufferQueueRef.current = [];

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // Setup keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!sessionId) return;

      const button = keyToButton(e.key);
      if (button) {
        e.preventDefault();
        sendInput(button, "down");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!sessionId) return;

      const button = keyToButton(e.key);
      if (button) {
        e.preventDefault();
        sendInput(button, "up");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [sessionId]);

  const keyToButton = (key: string): string | null => {
    const keyMap: Record<string, string> = {
      ArrowUp: "UP",
      ArrowDown: "DOWN",
      ArrowLeft: "LEFT",
      ArrowRight: "RIGHT",
      z: "A",
      x: "B",
      a: "L",
      s: "R",
      Enter: "START",
      Shift: "SELECT",
    };
    return keyMap[key] || null;
  };

  const sendInput = (button: string, state: "down" | "up") => {
    if (!socketRef.current || !sessionId) {
      console.warn(
        "Cannot send input - socket:",
        !!socketRef.current,
        "sessionId:",
        sessionId
      );
      return;
    }

    console.log("Sending input:", { button, state, sessionId });
    socketRef.current.emit("input", {
      sessionId,
      button,
      state,
    });
  };

  const playAudio = (audioData: any) => {
    if (!audioContextRef.current) {
      console.warn("Audio context not initialized");
      return;
    }

    const audioContext = audioContextRef.current;

    // Resume audio context if suspended (browser autoplay policy)
    if (audioContext.state === "suspended") {
      audioContext.resume().then(() => {
        console.log("Audio context resumed");
      });
    }

    try {
      // Decode base64 audio data
      const binaryString = atob(audioData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM int16 to float32 for Web Audio API
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        // Convert int16 (-32768 to 32767) to float32 (-1.0 to 1.0)
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const sampleRate = audioData.sampleRate || 32040;
      const channels = audioData.channels || 2;
      const samplesPerChannel = float32Array.length / channels;

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(
        channels,
        samplesPerChannel,
        sampleRate
      );

      // Fill buffer with audio data (interleaved to planar)
      for (let channel = 0; channel < channels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < samplesPerChannel; i++) {
          channelData[i] = float32Array[i * channels + channel];
        }
      }

      // Create buffer source and play
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);

      // Schedule playback
      const currentTime = audioContext.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);

      source.start(startTime);

      // Update next play time
      const duration = audioBuffer.duration;
      nextPlayTimeRef.current = startTime + duration;

      // Clean up after playback
      source.onended = () => {
        const index = audioBufferQueueRef.current.indexOf(source);
        if (index > -1) {
          audioBufferQueueRef.current.splice(index, 1);
        }
      };

      audioBufferQueueRef.current.push(source);

      // Log occasionally for debugging
      if (Math.random() < 0.01) {
        console.log("Playing audio:", {
          samples: samplesPerChannel,
          duration: duration.toFixed(3),
          channels,
          sampleRate,
          queueLength: audioBufferQueueRef.current.length,
        });
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const renderFrame = (frameData: any) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    if (frameData.format === "png" && frameData.data) {
      // Decode PNG frame
      const img = new Image();
      img.onload = () => {
        // Clear and draw image at native resolution
        ctx.clearRect(0, 0, 240, 160);
        ctx.drawImage(img, 0, 0, 240, 160);
      };
      img.onerror = (e) => {
        console.error("Failed to load frame image:", e);
      };
      img.src = `data:image/png;base64,${frameData.data}`;
    } else {
      // Fallback: render mock data with random colors
      console.warn("Using fallback rendering - no PNG data");
      ctx.fillStyle = `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${
        Math.random() * 255
      })`;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const createSession = async () => {
    try {
      setError(null);
      setStatus("Creating session...");

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://192.168.57.10:3000/api";
      const response = await fetch(`${apiBaseUrl}/emulator/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          romPath: ROM_PATH,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setStatus("Session created");

      // Subscribe to session updates via WebSocket
      if (socketRef.current) {
        socketRef.current.emit("subscribe", { sessionId: data.sessionId });
      }

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

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://192.168.57.10:3000/api";
      const response = await fetch(
        `${apiBaseUrl}/emulator/sessions/${sid}/start`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to start session: ${response.statusText}`);
      }

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

      const apiBaseUrl =
        import.meta.env.VITE_API_BASE_URL || "http://192.168.57.10:3000/api";
      const response = await fetch(
        `${apiBaseUrl}/emulator/sessions/${sessionId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to stop session: ${response.statusText}`);
      }

      setSessionId(null);
      setStatus("Stopped");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop emulation");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>mGBA Cloud Gaming Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>ROM:</strong> Kirby & The Amazing Mirror (USA)
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Status:</strong> {status}
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>WebSocket:</strong>{" "}
              {connected ? "Connected" : "Disconnected"}
            </p>
            {sessionId && (
              <p className="text-sm text-muted-foreground">
                <strong>Session ID:</strong> {sessionId}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={startEmulation} disabled={!!sessionId}>
              Start Emulation
            </Button>
            <Button
              onClick={stopEmulation}
              disabled={!sessionId}
              variant="destructive"
            >
              Stop Emulation
            </Button>
            <Button
              onClick={() => {
                if (audioContextRef.current?.state === "suspended") {
                  audioContextRef.current.resume().then(() => {
                    console.log("Audio enabled");
                  });
                }
              }}
              variant="outline"
            >
              🔊 Enable Audio
            </Button>
          </div>

          {/* Game Controls */}
          {sessionId && (
            <div className="space-y-2">
              <p className="font-medium text-sm">Test Controls:</p>
              <div className="grid grid-cols-4 gap-2">
                <Button
                  onClick={() => {
                    sendInput("UP", "down");
                    setTimeout(() => sendInput("UP", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  ↑ Up
                </Button>
                <Button
                  onClick={() => {
                    sendInput("DOWN", "down");
                    setTimeout(() => sendInput("DOWN", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  ↓ Down
                </Button>
                <Button
                  onClick={() => {
                    sendInput("LEFT", "down");
                    setTimeout(() => sendInput("LEFT", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  ← Left
                </Button>
                <Button
                  onClick={() => {
                    sendInput("RIGHT", "down");
                    setTimeout(() => sendInput("RIGHT", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  → Right
                </Button>
                <Button
                  onClick={() => {
                    sendInput("A", "down");
                    setTimeout(() => sendInput("A", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  Z (A)
                </Button>
                <Button
                  onClick={() => {
                    sendInput("B", "down");
                    setTimeout(() => sendInput("B", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  X (B)
                </Button>
                <Button
                  onClick={() => {
                    sendInput("START", "down");
                    setTimeout(() => sendInput("START", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  Enter
                </Button>
                <Button
                  onClick={() => {
                    sendInput("SELECT", "down");
                    setTimeout(() => sendInput("SELECT", "up"), 100);
                  }}
                  disabled={!sessionId}
                  variant="outline"
                  size="sm"
                >
                  Shift
                </Button>
              </div>
            </div>
          )}

          <div className="border rounded-lg p-4 bg-black inline-flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={240}
              height={160}
              style={{
                imageRendering: "pixelated",
                width: "480px",
                height: "320px",
              }}
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium">Controls:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Arrow Keys: D-Pad</div>
              <div>Z: A Button</div>
              <div>X: B Button</div>
              <div>A: L Trigger</div>
              <div>S: R Trigger</div>
              <div>Enter: Start</div>
              <div>Shift: Select</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
