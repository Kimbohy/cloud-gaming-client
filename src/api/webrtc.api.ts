import { io, Socket } from "socket.io-client";

// Configuration
const getServerHost = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:3000`;
};

const getSocketUrl = () => getServerHost();

export type StreamMode = "websocket" | "webrtc" | "both";

export interface WebRTCSessionInfo {
  sessionId: string;
  offer: RTCSessionDescriptionInit;
}

// WebRTC Manager for low-latency streaming
export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private webrtcSessionId: string | null = null;
  private _gameSessionId: string | null = null;

  // Callbacks
  private onVideoTrackCallback?: (stream: MediaStream) => void;
  private onAudioTrackCallback?: (stream: MediaStream) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  // ICE servers configuration
  private readonly iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  get gameSessionId(): string | null {
    return this._gameSessionId;
  }

  connect(): void {
    const serverUrl = getSocketUrl();

    this.socket = io(`${serverUrl}/webrtc`, {
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      console.log("✅ [WebRTC Signaling] Connected");
    });

    this.socket.on("disconnect", () => {
      console.log("❌ [WebRTC Signaling] Disconnected");
      this.cleanup();
      this.onDisconnectedCallback?.();
    });

    this.socket.on(
      "ice-candidate",
      async (data: { sessionId: string; candidate: RTCIceCandidateInit }) => {
        if (this.peerConnection && data.candidate) {
          try {
            await this.peerConnection.addIceCandidate(
              new RTCIceCandidate(data.candidate)
            );
          } catch (error) {
            console.error("Failed to add ICE candidate:", error);
          }
        }
      }
    );
  }

  async createSession(gameSessionId: string): Promise<boolean> {
    if (!this.socket?.connected) {
      console.error("WebRTC signaling socket not connected");
      return false;
    }

    this._gameSessionId = gameSessionId;

    return new Promise((resolve) => {
      this.socket!.emit(
        "create-session",
        { gameSessionId },
        async (response: {
          success: boolean;
          sessionId?: string;
          offer?: RTCSessionDescriptionInit;
          error?: string;
        }) => {
          if (!response.success || !response.offer || !response.sessionId) {
            console.error("Failed to create WebRTC session:", response.error);
            this.onErrorCallback?.(
              new Error(response.error || "Failed to create session")
            );
            resolve(false);
            return;
          }

          this.webrtcSessionId = response.sessionId;
          console.log("📡 WebRTC session created:", this.webrtcSessionId);

          // Create peer connection and handle offer
          const success = await this.handleOffer(response.offer);
          resolve(success);
        }
      );
    });
  }

  private async handleOffer(
    offer: RTCSessionDescriptionInit
  ): Promise<boolean> {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Set up event handlers
      this.setupPeerConnectionHandlers();

      // Set remote description (offer from server)
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer to server
      return new Promise((resolve) => {
        this.socket!.emit(
          "answer",
          {
            sessionId: this.webrtcSessionId,
            answer: this.peerConnection!.localDescription,
          },
          (response: { success: boolean; error?: string }) => {
            if (!response.success) {
              console.error("Failed to send answer:", response.error);
              resolve(false);
              return;
            }
            console.log("✅ WebRTC answer sent");
            resolve(true);
          }
        );
      });
    } catch (error) {
      console.error("Failed to handle WebRTC offer:", error);
      this.onErrorCallback?.(
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket?.connected) {
        this.socket.emit("ice-candidate", {
          sessionId: this.webrtcSessionId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log(`[WebRTC] Connection state: ${state}`);

      if (state === "connected") {
        this.onConnectedCallback?.();
      } else if (state === "disconnected" || state === "failed") {
        this.onDisconnectedCallback?.();
      }
    };

    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(
        `[WebRTC] ICE connection state: ${this.peerConnection?.iceConnectionState}`
      );
    };

    // Handle incoming tracks (video/audio from server)
    this.peerConnection.ontrack = (event) => {
      console.log(`[WebRTC] Received track: ${event.track.kind}`);

      if (event.track.kind === "video") {
        const videoStream = new MediaStream([event.track]);
        this.onVideoTrackCallback?.(videoStream);
      } else if (event.track.kind === "audio") {
        const audioStream = new MediaStream([event.track]);
        this.onAudioTrackCallback?.(audioStream);
      }
    };

    // Handle data channel from server
    this.peerConnection.ondatachannel = (event) => {
      console.log(`[WebRTC] Data channel received: ${event.channel.label}`);
      this.dataChannel = event.channel;
      this.setupDataChannelHandlers();
    };
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log("[WebRTC] ✅ Data channel opened - ready for input");
    };

    this.dataChannel.onclose = () => {
      console.log("[WebRTC] Data channel closed");
    };

    this.dataChannel.onerror = (error) => {
      console.error("[WebRTC] Data channel error:", error);
    };

    this.dataChannel.onmessage = (event) => {
      console.log("[WebRTC] Data channel message from server:", event.data);
    };
  }

  // Send input through WebRTC data channel (lowest latency)
  sendInput(button: string, state: "down" | "up"): void {
    if (!this.dataChannel) {
      console.warn("[WebRTC] Data channel not available");
      return;
    }

    if (this.dataChannel.readyState !== "open") {
      console.warn(
        `[WebRTC] Data channel not ready, state: ${this.dataChannel.readyState}`
      );
      return;
    }

    const message = JSON.stringify({
      type: "input",
      button,
      state,
      timestamp: Date.now(),
    });

    console.log(`[WebRTC] Sending input: ${button} ${state}`);
    this.dataChannel.send(message);
  }

  // Event callbacks
  onVideoTrack(callback: (stream: MediaStream) => void): void {
    this.onVideoTrackCallback = callback;
  }

  onAudioTrack(callback: (stream: MediaStream) => void): void {
    this.onAudioTrackCallback = callback;
  }

  onConnected(callback: () => void): void {
    this.onConnectedCallback = callback;
  }

  onDisconnected(callback: () => void): void {
    this.onDisconnectedCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  isConnected(): boolean {
    return this.peerConnection?.connectionState === "connected";
  }

  isSocketConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isDataChannelReady(): boolean {
    return this.dataChannel?.readyState === "open";
  }

  async closeSession(): Promise<void> {
    if (this.socket?.connected && this.webrtcSessionId) {
      return new Promise((resolve) => {
        this.socket!.emit(
          "close-session",
          { sessionId: this.webrtcSessionId },
          () => {
            this.cleanup();
            resolve();
          }
        );
      });
    }
    this.cleanup();
  }

  private cleanup(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.webrtcSessionId = null;
  }

  disconnect(): void {
    this.cleanup();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

// WebRTC Video Renderer - renders MediaStream to canvas
export class WebRTCVideoRenderer {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");

    // Create hidden video element for rendering
    this.videoElement = document.createElement("video");
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.muted = true; // Audio handled separately
  }

  setVideoStream(stream: MediaStream): void {
    if (!this.videoElement) return;

    this.videoElement.srcObject = stream;
    this.videoElement.play().catch(console.error);

    // Start render loop
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const render = () => {
      if (this.videoElement && this.context && this.canvas) {
        // Draw video frame to canvas
        if (this.videoElement.readyState >= 2) {
          this.context.drawImage(
            this.videoElement,
            0,
            0,
            this.canvas.width,
            this.canvas.height
          );
        }
      }
      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.canvas = null;
    this.context = null;
  }
}

// WebRTC Audio Player - plays MediaStream audio
export class WebRTCAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;

  initialize(): void {
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.volume = 1.0;
    // Append to body for some browsers that require DOM presence
    this.audioElement.style.display = "none";
    document.body.appendChild(this.audioElement);
    console.log("[WebRTC Audio] Audio element initialized");
  }

  setAudioStream(stream: MediaStream): void {
    if (!this.audioElement) {
      console.warn("[WebRTC Audio] Audio element not initialized");
      return;
    }

    const audioTracks = stream.getAudioTracks();
    console.log(
      "[WebRTC Audio] Setting audio stream with",
      audioTracks.length,
      "tracks"
    );

    // Log track details
    audioTracks.forEach((track, index) => {
      console.log(
        `[WebRTC Audio] Track ${index}: enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`
      );
      // Ensure track is enabled
      track.enabled = true;
    });

    this.audioElement.srcObject = stream;
    this.audioElement.muted = false;
    this.audioElement.volume = 1.0;

    // Try to play
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("[WebRTC Audio] ✅ Audio playback started");
        })
        .catch((error) => {
          console.warn("[WebRTC Audio] Autoplay blocked:", error);
          // Set up click handler to resume
          this.setupClickToPlay();
        });
    }
  }

  private setupClickToPlay(): void {
    const resumeHandler = async () => {
      await this.resume();
      document.removeEventListener("click", resumeHandler);
      document.removeEventListener("keydown", resumeHandler);
      document.removeEventListener("touchstart", resumeHandler);
    };
    document.addEventListener("click", resumeHandler);
    document.addEventListener("keydown", resumeHandler);
    document.addEventListener("touchstart", resumeHandler);
  }

  async resume(): Promise<void> {
    if (this.audioElement) {
      try {
        this.audioElement.muted = false;
        this.audioElement.volume = 1.0;
        if (this.audioElement.paused) {
          console.log("[WebRTC Audio] Resuming audio playback");
          await this.audioElement.play();
          console.log("[WebRTC Audio] ✅ Audio resumed successfully");
        }
      } catch (error) {
        console.warn("[WebRTC Audio] Failed to resume:", error);
      }
    }
  }

  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  mute(): void {
    if (this.audioElement) {
      this.audioElement.muted = true;
    }
  }

  unmute(): void {
    if (this.audioElement) {
      this.audioElement.muted = false;
    }
  }

  cleanup(): void {
    if (this.audioElement) {
      this.audioElement.srcObject = null;
      // Remove from DOM
      if (this.audioElement.parentNode) {
        this.audioElement.parentNode.removeChild(this.audioElement);
      }
      this.audioElement = null;
    }
  }
}

// API function to update stream mode
export async function setStreamMode(
  sessionId: string,
  mode: StreamMode
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${getServerHost()}/api/emulator/sessions/${sessionId}/stream-mode`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// API function to get stream mode
export async function getStreamMode(
  sessionId: string
): Promise<{ mode: StreamMode | null; error?: string }> {
  try {
    const response = await fetch(
      `${getServerHost()}/api/emulator/sessions/${sessionId}/stream-mode`
    );

    if (!response.ok) {
      const error = await response.text();
      return { mode: null, error };
    }

    const data = await response.json();
    return { mode: data.streamMode };
  } catch (error) {
    return {
      mode: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
