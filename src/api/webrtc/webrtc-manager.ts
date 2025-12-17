import { io, Socket } from "socket.io-client";
import { getSocketUrl, ICE_SERVERS } from "./config";
import type { AudioData } from "./types";
import { decodeADPCM } from "./adpcm-decoder";

// WebRTC Manager for low-latency streaming
export class WebRTCManager {
  private socket: Socket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private audioDataChannel: RTCDataChannel | null = null;
  private webrtcSessionId: string | null = null;
  private _gameSessionId: string | null = null;

  private onVideoTrackCallback?: (stream: MediaStream) => void;
  private onAudioTrackCallback?: (stream: MediaStream) => void;
  private onAudioDataCallback?: (audioData: AudioData) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  get gameSessionId(): string | null {
    return this._gameSessionId;
  }

  connect(): void {
    const serverUrl = getSocketUrl();

    this.socket = io(`${serverUrl}/webrtc`, {
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {});

    this.socket.on("disconnect", () => {
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
      this.peerConnection = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      });

      this.setupPeerConnectionHandlers();

      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

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

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socket?.connected) {
        this.socket.emit("ice-candidate", {
          sessionId: this.webrtcSessionId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;

      if (state === "connected") {
        this.onConnectedCallback?.();
      } else if (state === "disconnected" || state === "failed") {
        this.onDisconnectedCallback?.();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {};

    this.peerConnection.ontrack = (event) => {
      if (event.receiver && "playoutDelayHint" in event.receiver) {
        (event.receiver as any).playoutDelayHint = 0;
      }

      if (event.track.kind === "video") {
        const videoStream = new MediaStream([event.track]);
        this.onVideoTrackCallback?.(videoStream);
      } else if (event.track.kind === "audio") {
        const audioStream = new MediaStream([event.track]);
        this.onAudioTrackCallback?.(audioStream);
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      if (event.channel.label === "input") {
        this.dataChannel = event.channel;
        this.setupDataChannelHandlers();
      } else if (event.channel.label === "audio") {
        this.audioDataChannel = event.channel;
        this.setupAudioDataChannelHandlers();
      }
    };
  }

  private setupAudioDataChannelHandlers(): void {
    if (!this.audioDataChannel) return;

    this.audioDataChannel.binaryType = "arraybuffer";

    this.audioDataChannel.onopen = () => {};

    this.audioDataChannel.onclose = () => {};

    this.audioDataChannel.onerror = (error) => {
      console.error("[WebRTC] Audio data channel error:", error);
    };

    this.audioDataChannel.onmessage = (event) => {
      try {
        const buffer = event.data as ArrayBuffer;
        const dataView = new DataView(buffer);

        if (Math.random() < 0.01) {
        }
        const sampleRate = dataView.getUint32(0, true);
        const channels = dataView.getUint32(4, true);

        // Check if we have the new format (16 bytes header) or old (12 bytes)
        // We can guess by checking buffer length vs expected length
        // But since we updated server, let's assume new format or check format field

        let format = 0; // 0=PCM
        let dataOffset = 12;
        let dataLength = 0;

        // Heuristic: if buffer length >= 16, check if 3rd word looks like format (0 or 1)
        // and 4th word looks like length matching buffer size
        if (buffer.byteLength >= 16) {
          const potentialFormat = dataView.getUint32(8, true);
          const potentialLength = dataView.getUint32(12, true);

          if (
            (potentialFormat === 0 || potentialFormat === 1) &&
            16 + potentialLength === buffer.byteLength
          ) {
            format = potentialFormat;
            dataLength = potentialLength;
            dataOffset = 16;
          } else {
            dataLength = dataView.getUint32(8, true);
            dataOffset = 12;
          }
        } else {
          dataLength = dataView.getUint32(8, true);
          dataOffset = 12;
        }

        let audioData: Int16Array;

        if (format === 1) {
          const adpcmData = new Uint8Array(buffer, dataOffset, dataLength);
          audioData = decodeADPCM(adpcmData, channels);
        } else {
          audioData = new Int16Array(buffer, dataOffset, dataLength / 2);
        }

        this.onAudioDataCallback?.({
          samples: audioData,
          sampleRate,
          channels,
        });
      } catch (error) {
        console.error("[WebRTC] Failed to parse audio data:", error);
      }
    };
  }

  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {};

    this.dataChannel.onclose = () => {};

    this.dataChannel.onerror = (error) => {
      console.error("[WebRTC] Data channel error:", error);
    };

    this.dataChannel.onmessage = () => {};
  }

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

    // Binary protocol for ultra-low latency (2 bytes vs ~80 bytes JSON)
    // Byte 0: Button ID
    // Byte 1: State (0=UP, 1=DOWN)
    const BUTTON_MAP: Record<string, number> = {
      A: 0,
      B: 1,
      SELECT: 2,
      START: 3,
      UP: 4,
      DOWN: 5,
      LEFT: 6,
      RIGHT: 7,
      L: 8,
      R: 9,
    };

    const buttonId = BUTTON_MAP[button];
    if (buttonId !== undefined) {
      const buffer = new Uint8Array(2);
      buffer[0] = buttonId;
      buffer[1] = state === "down" ? 1 : 0;
      this.dataChannel.send(buffer);
    } else {
      const message = JSON.stringify({
        type: "input",
        button,
        state,
        timestamp: Date.now(),
      });
      this.dataChannel.send(message);
    }
  }

  onVideoTrack(callback: (stream: MediaStream) => void): void {
    this.onVideoTrackCallback = callback;
  }

  onAudioTrack(callback: (stream: MediaStream) => void): void {
    this.onAudioTrackCallback = callback;
  }

  onAudioData(callback: (audioData: AudioData) => void): void {
    this.onAudioDataCallback = callback;
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

  /**
   * Request to save the current emulator state
   * @param gameSessionId The game session ID
   * @param callback Called with the result containing base64 state data
   */
  saveState(
    gameSessionId: string,
    callback: (result: {
      success: boolean;
      stateData?: string;
      thumbnail?: string;
      error?: string;
    }) => void
  ): void {
    if (!this.socket?.connected) {
      console.error("[WebRTCManager] Socket not connected");
      callback({ success: false, error: "Not connected" });
      return;
    }

    this.socket.emit("save-state", { gameSessionId }, (response: any) => {
      callback(response);
    });
  }

  /**
   * Request to load a saved emulator state
   * @param gameSessionId The game session ID
   * @param stateData Base64 encoded state data
   * @param callback Called with the result
   */
  loadState(
    gameSessionId: string,
    stateData: string,
    callback: (result: { success: boolean; error?: string }) => void
  ): void {
    if (!this.socket?.connected) {
      callback({ success: false, error: "Not connected" });
      return;
    }

    this.socket.emit("load-state", { gameSessionId, stateData }, callback);
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

    if (this.audioDataChannel) {
      this.audioDataChannel.close();
      this.audioDataChannel = null;
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
