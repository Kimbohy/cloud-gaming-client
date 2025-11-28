import { io, Socket } from "socket.io-client";

// Custom API Error class
export class PlayApiError extends Error {
  status?: number;
  isNetworkError: boolean;

  constructor(
    message: string,
    status?: number,
    isNetworkError: boolean = false
  ) {
    super(message);
    this.name = "PlayApiError";
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

// Helper function to handle fetch with error handling
async function fetchWithErrorHandling<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new PlayApiError(
        errorText || `HTTP Error ${response.status}`,
        response.status,
        false
      );
    }

    const text = await response.text();
    if (!text) return {} as T;
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof PlayApiError) {
      throw error;
    }

    // Network error (server not started, no connection, etc.)
    if (error instanceof TypeError) {
      throw new PlayApiError(
        "Impossible de se connecter au serveur. Vérifiez que le serveur est démarré.",
        undefined,
        true
      );
    }

    throw new PlayApiError(
      "Une erreur inattendue s'est produite",
      undefined,
      false
    );
  }
}

// Types
export interface GameSession {
  sessionId: string;
}

export interface AudioData {
  data: string;
  sampleRate?: number;
  channels?: number;
}

export interface FrameData {
  format: string;
  data?: string;
}

export type InputButton =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "A"
  | "B"
  | "L"
  | "R"
  | "START"
  | "SELECT";

export type InputState = "down" | "up";

// Configuration - Use current hostname to support IP access
const getServerHost = () => {
  // If env variable is set, use it (should NOT include /api)
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  // Otherwise, use the current browser hostname with server port
  const hostname = window.location.hostname;
  return `http://${hostname}:3000`;
};

const getApiBaseUrl = () => `${getServerHost()}/api`;

const getSocketUrl = () => getServerHost();

// Key mapping
const KEY_MAP: Record<string, InputButton> = {
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

export function keyToButton(key: string): InputButton | null {
  return KEY_MAP[key] || null;
}

// Session API
export async function createGameSession(romPath: string): Promise<GameSession> {
  return fetchWithErrorHandling<GameSession>(
    `${getApiBaseUrl()}/emulator/sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ romPath }),
    }
  );
}

export async function startGameSession(sessionId: string): Promise<void> {
  return fetchWithErrorHandling<void>(
    `${getApiBaseUrl()}/emulator/sessions/${sessionId}/start`,
    {
      method: "POST",
    }
  );
}

export async function stopGameSession(sessionId: string): Promise<void> {
  return fetchWithErrorHandling<void>(
    `${getApiBaseUrl()}/emulator/sessions/${sessionId}`,
    {
      method: "DELETE",
    }
  );
}

// WebSocket Management - Multi-channel for better performance
export class GameSocketManager {
  private controlSocket: Socket | null = null;
  private videoSocket: Socket | null = null;
  private audioSocket: Socket | null = null;
  private inputSocket: Socket | null = null;

  private onConnectCallback?: () => void;
  private onDisconnectCallback?: () => void;
  private onFrameCallback?: (data: FrameData) => void;
  private onAudioCallback?: (data: AudioData) => void;

  private connectionCount = 0;
  private readonly expectedConnections = 4;

  connect(): void {
    const serverUrl = getSocketUrl();

    // Control socket (main namespace)
    this.controlSocket = io(serverUrl, {
      transports: ["websocket"], // Force WebSocket only
    });

    // Video stream socket (separate namespace)
    this.videoSocket = io(`${serverUrl}/video`, {
      transports: ["websocket"],
    });

    // Audio stream socket (separate namespace)
    this.audioSocket = io(`${serverUrl}/audio`, {
      transports: ["websocket"],
    });

    // Input socket (separate namespace)
    this.inputSocket = io(`${serverUrl}/input`, {
      transports: ["websocket"],
    });

    // Setup control socket handlers
    this.controlSocket.on("connect", () => {
      console.log("✅ [Control] Connected");
      this.checkAllConnected();
    });

    this.controlSocket.on("disconnect", () => {
      console.log("❌ [Control] Disconnected");
      this.onDisconnectCallback?.();
    });

    // Setup video socket handlers
    this.videoSocket.on("connect", () => {
      console.log("✅ [Video] Connected");
      this.checkAllConnected();
    });

    this.videoSocket.on("frame", (data: FrameData) => {
      this.onFrameCallback?.(data);
    });

    this.videoSocket.on("disconnect", () => {
      console.log("❌ [Video] Disconnected");
    });

    // Setup audio socket handlers
    this.audioSocket.on("connect", () => {
      console.log("✅ [Audio] Connected");
      this.checkAllConnected();
    });

    this.audioSocket.on("audio", (data: AudioData) => {
      this.onAudioCallback?.(data);
    });

    this.audioSocket.on("disconnect", () => {
      console.log("❌ [Audio] Disconnected");
    });

    // Setup input socket handlers
    this.inputSocket.on("connect", () => {
      console.log("✅ [Input] Connected");
      this.checkAllConnected();
    });

    this.inputSocket.on("disconnect", () => {
      console.log("❌ [Input] Disconnected");
    });
  }

  private checkAllConnected(): void {
    const allConnected =
      this.controlSocket?.connected &&
      this.videoSocket?.connected &&
      this.audioSocket?.connected &&
      this.inputSocket?.connected;

    if (allConnected && this.connectionCount === 0) {
      console.log("🎮 All channels connected - Ready to play!");
      this.connectionCount = this.expectedConnections;
      this.onConnectCallback?.();
    }
  }

  disconnect(): void {
    this.controlSocket?.disconnect();
    this.videoSocket?.disconnect();
    this.audioSocket?.disconnect();
    this.inputSocket?.disconnect();

    this.controlSocket = null;
    this.videoSocket = null;
    this.audioSocket = null;
    this.inputSocket = null;
    this.connectionCount = 0;
  }

  subscribeToSession(sessionId: string): void {
    if (!this.isConnected()) {
      throw new Error("Sockets not connected");
    }

    // Subscribe on all channels
    console.log("📡 Subscribing to session:", sessionId);
    this.controlSocket?.emit("subscribe", { sessionId });
    this.videoSocket?.emit("subscribe", { sessionId });
    this.audioSocket?.emit("subscribe", { sessionId });
    this.inputSocket?.emit("subscribe", { sessionId });
  }

  sendInput(sessionId: string, button: InputButton, state: InputState): void {
    if (!this.inputSocket?.connected) {
      console.warn("Cannot send input - input socket not connected");
      return;
    }

    // Send through dedicated input channel for minimal latency
    this.inputSocket.emit("input", { sessionId, button, state });
  }

  onConnect(callback: () => void): void {
    this.onConnectCallback = callback;
  }

  onDisconnect(callback: () => void): void {
    this.onDisconnectCallback = callback;
  }

  onFrame(callback: (data: FrameData) => void): void {
    this.onFrameCallback = callback;
  }

  onAudio(callback: (data: AudioData) => void): void {
    this.onAudioCallback = callback;
  }

  isConnected(): boolean {
    return (
      (this.controlSocket?.connected ?? false) &&
      (this.videoSocket?.connected ?? false) &&
      (this.audioSocket?.connected ?? false) &&
      (this.inputSocket?.connected ?? false)
    );
  }
}

// Audio Management
export class GameAudioManager {
  private audioContext: AudioContext | null = null;
  private audioBufferQueue: AudioBufferSourceNode[] = [];
  private nextPlayTime: number = 0;

  initialize(): void {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();

    console.log("Audio Context initialized:", {
      sampleRate: this.audioContext.sampleRate,
      state: this.audioContext.state,
    });
  }

  async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
      console.log("Audio context resumed");
    }
  }

  playAudio(audioData: AudioData): void {
    if (!this.audioContext) {
      console.warn("Audio context not initialized");
      return;
    }

    const audioContext = this.audioContext;

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
      const startTime = Math.max(currentTime, this.nextPlayTime);

      source.start(startTime);

      // Update next play time
      const duration = audioBuffer.duration;
      this.nextPlayTime = startTime + duration;

      // Clean up after playback
      source.onended = () => {
        const index = this.audioBufferQueue.indexOf(source);
        if (index > -1) {
          this.audioBufferQueue.splice(index, 1);
        }
      };

      this.audioBufferQueue.push(source);

      // Log occasionally for debugging
      if (Math.random() < 0.01) {
        console.log("Playing audio:", {
          samples: samplesPerChannel,
          duration: duration.toFixed(3),
          channels,
          sampleRate,
          queueLength: this.audioBufferQueue.length,
        });
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  }

  cleanup(): void {
    // Stop all audio sources
    this.audioBufferQueue.forEach((node) => {
      try {
        node.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    });
    this.audioBufferQueue = [];

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Video/Canvas Management
export class GameCanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
  }

  renderFrame(frameData: FrameData): void {
    if (!this.canvas || !this.context) {
      console.warn("Canvas not initialized");
      return;
    }

    if (frameData.format === "png" && frameData.data) {
      // Decode PNG frame
      const img = new Image();
      img.onload = () => {
        if (this.context) {
          // Clear and draw image at native resolution
          this.context.clearRect(0, 0, 240, 160);
          this.context.drawImage(img, 0, 0, 240, 160);
        }
      };
      img.onerror = (e) => {
        console.error("Failed to load frame image:", e);
      };
      img.src = `data:image/png;base64,${frameData.data}`;
    } else {
      // Fallback: render mock data with random colors
      console.warn("Using fallback rendering - no PNG data");
      this.context.fillStyle = `rgb(${Math.random() * 255}, ${
        Math.random() * 255
      }, ${Math.random() * 255})`;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Input Management
export class GameInputManager {
  private sessionId: string | null = null;
  private socketManager: GameSocketManager;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(socketManager: GameSocketManager) {
    this.socketManager = socketManager;
  }

  setSessionId(sessionId: string | null): void {
    this.sessionId = sessionId;
  }

  setupKeyboardControls(): void {
    this.keyDownHandler = (e: KeyboardEvent) => {
      if (!this.sessionId) return;

      const button = keyToButton(e.key);
      if (button) {
        e.preventDefault();
        this.socketManager.sendInput(this.sessionId, button, "down");
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (!this.sessionId) return;

      const button = keyToButton(e.key);
      if (button) {
        e.preventDefault();
        this.socketManager.sendInput(this.sessionId, button, "up");
      }
    };

    window.addEventListener("keydown", this.keyDownHandler);
    window.addEventListener("keyup", this.keyUpHandler);
  }

  sendButtonPress(button: InputButton, duration: number = 100): void {
    if (!this.sessionId) return;

    this.socketManager.sendInput(this.sessionId, button, "down");
    setTimeout(() => {
      if (this.sessionId) {
        this.socketManager.sendInput(this.sessionId, button, "up");
      }
    }, duration);
  }

  cleanup(): void {
    if (this.keyDownHandler) {
      window.removeEventListener("keydown", this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      window.removeEventListener("keyup", this.keyUpHandler);
    }
  }
}
