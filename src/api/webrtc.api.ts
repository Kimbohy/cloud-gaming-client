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
  private audioDataChannel: RTCDataChannel | null = null; // Dedicated channel for audio
  private webrtcSessionId: string | null = null;
  private _gameSessionId: string | null = null;

  // Callbacks
  private onVideoTrackCallback?: (stream: MediaStream) => void;
  private onAudioTrackCallback?: (stream: MediaStream) => void;
  private onAudioDataCallback?: (audioData: {
    samples: Int16Array;
    sampleRate: number;
    channels: number;
  }) => void;
  private onConnectedCallback?: () => void;
  private onDisconnectedCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  // IMA ADPCM Tables
  private readonly indexTable = [
    -1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8,
  ];

  private readonly stepTable = [
    7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
    50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
    253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
    1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024,
    3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493,
    10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086,
    29794, 32767,
  ];

  private decodeADPCM(data: Uint8Array, channels: number): Int16Array {
    let bufferIdx = 0;
    const predictedSample = [0, 0];
    const index = [0, 0];

    // Read initial state
    for (let ch = 0; ch < channels; ch++) {
      const low = data[bufferIdx++];
      const high = data[bufferIdx++];
      predictedSample[ch] = (high << 8) | low;
      if (predictedSample[ch] & 0x8000) predictedSample[ch] -= 0x10000;

      index[ch] = data[bufferIdx++];
      bufferIdx++; // Reserved
    }

    const dataLen = data.length - bufferIdx;
    const samplesCount = dataLen * 2;
    const output = new Int16Array(samplesCount);

    let outIdx = 0;

    for (let i = 0; i < dataLen; i++) {
      const byte = data[bufferIdx++];

      for (let nibble = 0; nibble < 2; nibble++) {
        const delta = nibble === 0 ? byte & 0x0f : (byte >> 4) & 0x0f;
        const ch = outIdx % channels;

        const step = this.stepTable[index[ch]];
        let vpdiff = step >> 3;

        if ((delta & 4) !== 0) vpdiff += step;
        if ((delta & 2) !== 0) vpdiff += step >> 1;
        if ((delta & 1) !== 0) vpdiff += step >> 2;

        if ((delta & 8) !== 0) predictedSample[ch] -= vpdiff;
        else predictedSample[ch] += vpdiff;

        if (predictedSample[ch] > 32767) predictedSample[ch] = 32767;
        else if (predictedSample[ch] < -32768) predictedSample[ch] = -32768;

        output[outIdx++] = predictedSample[ch];

        index[ch] += this.indexTable[delta & 7];
        if (index[ch] < 0) index[ch] = 0;
        else if (index[ch] > 88) index[ch] = 88;
      }
    }

    return output;
  }

  // ICE servers configuration - optimized for low latency
  private readonly iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
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
      // Create peer connection with low latency optimizations
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
        iceCandidatePoolSize: 10, // Pre-gather candidates for faster connection
        bundlePolicy: "max-bundle", // Bundle all media on single transport
        rtcpMuxPolicy: "require", // Reduce ports needed
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

      // Optimize receiver for low latency
      // playoutDelayHint = 0 tells the browser to buffer as little as possible
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

    // Handle data channel from server
    this.peerConnection.ondatachannel = (event) => {
      console.log(`[WebRTC] Data channel received: ${event.channel.label}`);

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

    this.audioDataChannel.onopen = () => {
      console.log("[WebRTC] ✅ Audio data channel opened");
    };

    this.audioDataChannel.onclose = () => {
      console.log("[WebRTC] Audio data channel closed");
    };

    this.audioDataChannel.onerror = (error) => {
      console.error("[WebRTC] Audio data channel error:", error);
    };

    this.audioDataChannel.onmessage = (event) => {
      try {
        const buffer = event.data as ArrayBuffer;
        const dataView = new DataView(buffer);

        // Debug: log occasionally
        if (Math.random() < 0.01) {
          console.log(
            `[WebRTC] Audio data received: ${buffer.byteLength} bytes`
          );
        }

        // Parse header (16 bytes)
        // [SampleRate(4)][Channels(4)][Format(4)][Length(4)]
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
            // Fallback to old format
            dataLength = dataView.getUint32(8, true);
            dataOffset = 12;
          }
        } else {
          // Old format
          dataLength = dataView.getUint32(8, true);
          dataOffset = 12;
        }

        let audioData: Int16Array;

        if (format === 1) {
          // ADPCM
          const adpcmData = new Uint8Array(buffer, dataOffset, dataLength);
          audioData = this.decodeADPCM(adpcmData, channels);
        } else {
          // PCM
          audioData = new Int16Array(buffer, dataOffset, dataLength / 2);
        }

        // Call callback with audio data
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
      // Fallback to JSON for unknown buttons or debug
      const message = JSON.stringify({
        type: "input",
        button,
        state,
        timestamp: Date.now(),
      });
      this.dataChannel.send(message);
    }
  }

  // Event callbacks
  onVideoTrack(callback: (stream: MediaStream) => void): void {
    this.onVideoTrackCallback = callback;
  }

  onAudioTrack(callback: (stream: MediaStream) => void): void {
    this.onAudioTrackCallback = callback;
  }

  onAudioData(
    callback: (audioData: {
      samples: Int16Array;
      sampleRate: number;
      channels: number;
    }) => void
  ): void {
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
    console.log(
      "[WebRTCManager] saveState called, gameSessionId:",
      gameSessionId
    );
    console.log("[WebRTCManager] socket connected:", this.socket?.connected);

    if (!this.socket?.connected) {
      console.error("[WebRTCManager] Socket not connected");
      callback({ success: false, error: "Not connected" });
      return;
    }

    console.log("[WebRTCManager] Emitting save-state event...");
    this.socket.emit("save-state", { gameSessionId }, (response: any) => {
      console.log("[WebRTCManager] save-state response:", response);
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

// WebRTC Video Renderer - renders MediaStream to canvas using WebCodecs or fallback
export class WebRTCVideoRenderer {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private abortController: AbortController | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", {
      alpha: false, // Disable alpha for better performance
      desynchronized: true, // Reduce latency by not syncing with display
    });
  }

  setVideoStream(stream: MediaStream): void {
    if (!this.canvas || !this.context) return;

    // Stop previous rendering
    this.cleanup();

    // Configure stream for low latency
    stream.getVideoTracks().forEach((track) => {
      // Request low latency content hint
      if ("contentHint" in track) {
        (track as any).contentHint = "motion"; // Optimize for gaming
      }
    });

    // Try WebCodecs (MediaStreamTrackProcessor) for lowest latency
    if ("MediaStreamTrackProcessor" in window) {
      console.log("[WebRTC Video] Using WebCodecs (MediaStreamTrackProcessor)");
      this.renderWithWebCodecs(stream);
    } else {
      console.log("[WebRTC Video] Fallback to HTMLVideoElement");
      this.renderWithVideoElement(stream);
    }
  }

  private async renderWithWebCodecs(stream: MediaStream): Promise<void> {
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      // @ts-ignore - WebCodecs API might not be in TS types yet
      const processor = new MediaStreamTrackProcessor({ track });
      const reader = processor.readable.getReader();

      while (!signal.aborted) {
        const { done, value: frame } = await reader.read();
        if (done) break;

        if (frame) {
          if (!signal.aborted && this.context && this.canvas) {
            // Draw frame directly to canvas
            this.context.drawImage(
              frame,
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
          }
          frame.close(); // Important: release memory immediately
        }
      }
      reader.releaseLock();
    } catch (error) {
      console.error("[WebRTC Video] WebCodecs error:", error);
      // If WebCodecs fails, try fallback?
      if (!signal.aborted) {
        this.renderWithVideoElement(stream);
      }
    }
  }

  private renderWithVideoElement(stream: MediaStream): void {
    // Create hidden video element for rendering
    if (!this.videoElement) {
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      (this.videoElement as any).disableRemotePlayback = true;
      this.videoElement.preload = "none";
      if ("requestVideoFrameCallback" in this.videoElement) {
        this.videoElement.setAttribute("playsinline", "");
      }
    }

    this.videoElement.srcObject = stream;

    const playPromise = this.videoElement.play();
    if (playPromise) {
      playPromise.catch(console.error);
    }

    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Use requestVideoFrameCallback for lowest latency if available
    if (
      this.videoElement &&
      "requestVideoFrameCallback" in HTMLVideoElement.prototype
    ) {
      const renderVideoFrame = () => {
        if (this.videoElement && this.context && this.canvas) {
          if (this.videoElement.readyState >= 2) {
            this.context.drawImage(
              this.videoElement,
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
          }
          // Request next frame callback
          (this.videoElement as any).requestVideoFrameCallback(
            renderVideoFrame
          );
        }
      };
      (this.videoElement as any).requestVideoFrameCallback(renderVideoFrame);
    } else {
      // Fallback to requestAnimationFrame
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
  }

  cleanup(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // Don't clear canvas/context as they might be reused
  }
}

// WebRTC Audio Player - plays MediaStream audio or raw PCM data with low latency
import audioWorkletUrl from "../lib/audio-worklet-processor.ts?worker&url";

export class WebRTCAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  // Low-latency PCM audio playback
  private audioWorkletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioQueue: Float32Array[] = [];
  private queuedSamples: number = 0;
  private currentBuffer: Float32Array | null = null;
  private currentBufferOffset: number = 0;
  private lastUnderrun: number = 0;
  private maxQueueMs: number = 60; // Max 60ms buffer for ultra-low latency
  private channels: number = 2;

  async initialize(): Promise<void> {
    // Create audio element as fallback for MediaStream
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.muted = true;
    this.audioElement.volume = 1.0;
    this.audioElement.style.display = "none";
    document.body.appendChild(this.audioElement);

    // Initialize Web Audio API with low latency settings
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      // Request low latency
      this.audioContext = new AudioContextClass({
        latencyHint: "interactive",
        sampleRate: 48000, // Match WebRTC audio rate
      });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 1.0;

      // Load AudioWorklet module
      try {
        await this.audioContext.audioWorklet.addModule(audioWorkletUrl);

        this.audioWorkletNode = new AudioWorkletNode(
          this.audioContext,
          "webrtc-audio-processor",
          {
            outputChannelCount: [2], // Stereo output
          }
        );

        this.audioWorkletNode.connect(this.gainNode);

        // Handle messages from the processor (e.g. latency stats)
        this.audioWorkletNode.port.onmessage = (event) => {
          if (event.data.type === "latency") {
            // console.log(`[AudioWorklet] Latency: ${event.data.latencyMs.toFixed(1)}ms`);
          }
        };

        console.log("[WebRTC Audio] AudioWorklet initialized successfully");
      } catch (e) {
        console.error(
          "[WebRTC Audio] Failed to load AudioWorklet, falling back to ScriptProcessor:",
          e
        );

        // Fallback to ScriptProcessorNode
        const bufferSize = 512;
        this.scriptProcessor = this.audioContext.createScriptProcessor(
          bufferSize,
          0, // No input channels
          2 // Stereo output
        );

        this.scriptProcessor.onaudioprocess = (event) => {
          this.processAudio(event);
        };

        this.scriptProcessor.connect(this.gainNode);
        console.log("[WebRTC Audio] ScriptProcessor initialized as fallback");
      }

      console.log(
        "[WebRTC Audio] Low-latency audio initialized:",
        `sampleRate=${this.audioContext.sampleRate}`,
        `baseLatency=${(this.audioContext.baseLatency * 1000).toFixed(1)}ms`,
        `outputLatency=${(
          (this.audioContext as any).outputLatency * 1000 || 0
        ).toFixed(1)}ms`
      );
    } catch (error) {
      console.warn("[WebRTC Audio] Failed to create AudioContext:", error);
    }

    console.log("[WebRTC Audio] Audio player initialized");
  }

  private processAudio(event: AudioProcessingEvent): void {
    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);
    const bufferSize = outputL.length;

    let outputOffset = 0;
    let hadUnderrun = false;

    while (outputOffset < bufferSize) {
      // Get next buffer from queue if needed
      if (
        !this.currentBuffer ||
        this.currentBufferOffset >= this.currentBuffer.length
      ) {
        const nextBuffer = this.audioQueue.shift();
        if (nextBuffer) {
          this.currentBuffer = nextBuffer;
          this.currentBufferOffset = 0;
          this.queuedSamples -= nextBuffer.length / this.channels;
        } else {
          this.currentBuffer = null;
        }
      }

      if (this.currentBuffer) {
        // Copy samples from current buffer to output
        const samplesAvailable =
          (this.currentBuffer.length - this.currentBufferOffset) /
          this.channels;
        const samplesNeeded = bufferSize - outputOffset;
        const samplesToCopy = Math.min(samplesAvailable, samplesNeeded);

        for (let i = 0; i < samplesToCopy; i++) {
          const srcIdx = this.currentBufferOffset + i * this.channels;
          outputL[outputOffset + i] = this.currentBuffer[srcIdx];
          outputR[outputOffset + i] =
            this.channels > 1
              ? this.currentBuffer[srcIdx + 1]
              : this.currentBuffer[srcIdx];
        }

        this.currentBufferOffset += samplesToCopy * this.channels;
        outputOffset += samplesToCopy;
      } else {
        // No data available - output silence (underrun)
        hadUnderrun = true;
        for (let i = outputOffset; i < bufferSize; i++) {
          outputL[i] = 0;
          outputR[i] = 0;
        }
        break;
      }
    }

    // Track underruns for debugging (but don't spam logs)
    if (hadUnderrun) {
      const now = Date.now();
      if (now - this.lastUnderrun > 1000) {
        // console.warn("[WebRTC Audio] Buffer underrun - waiting for data");
        this.lastUnderrun = now;
      }
    }
  }

  // Play PCM audio data received from DataChannel - optimized for low latency
  playPCMAudio(audioData: {
    samples: Int16Array;
    sampleRate: number;
    channels: number;
  }): void {
    if (!this.audioContext) {
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(console.error);
      return;
    }

    const { samples, sampleRate, channels } = audioData;
    this.channels = channels;

    if (samples.length === 0) return;

    // Convert Int16 to Float32
    const float32Array = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      float32Array[i] = samples[i] / 32768.0;
    }

    // Resample if necessary (input rate != output rate)
    let processedSamples: Float32Array;
    if (sampleRate !== this.audioContext.sampleRate) {
      processedSamples = this.resample(
        float32Array,
        sampleRate,
        this.audioContext.sampleRate,
        channels
      );
    } else {
      processedSamples = float32Array;
    }

    // Use AudioWorklet if available
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage(
        {
          type: "add-samples",
          samples: processedSamples,
          sampleRate: this.audioContext.sampleRate,
          channels: channels,
        },
        [processedSamples.buffer]
      ); // Transfer buffer ownership for performance
    }
    // Fallback to ScriptProcessor
    else if (this.scriptProcessor) {
      // Calculate queue limits - keep buffer small for low latency
      const maxQueueSamples =
        (this.maxQueueMs / 1000) * this.audioContext.sampleRate;

      // Drop old samples if queue is too large (to reduce latency)
      while (
        this.queuedSamples > maxQueueSamples &&
        this.audioQueue.length > 0
      ) {
        const dropped = this.audioQueue.shift();
        if (dropped) {
          this.queuedSamples -= dropped.length / channels;
        }
      }

      // Add new samples to queue
      this.audioQueue.push(processedSamples);
      this.queuedSamples += processedSamples.length / channels;
    }
  }

  // Simple linear interpolation resampling
  private resample(
    input: Float32Array,
    fromRate: number,
    toRate: number,
    channels: number
  ): Float32Array {
    if (fromRate === toRate) return input;

    const ratio = fromRate / toRate;
    const inputFrames = Math.floor(input.length / channels);
    const outputFrames = Math.floor(inputFrames / ratio);
    const output = new Float32Array(outputFrames * channels);

    for (let i = 0; i < outputFrames; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, inputFrames - 1);
      const fraction = srcIndex - srcIndexFloor;

      for (let ch = 0; ch < channels; ch++) {
        const sample1 = input[srcIndexFloor * channels + ch];
        const sample2 = input[srcIndexCeil * channels + ch];
        output[i * channels + ch] = sample1 + (sample2 - sample1) * fraction;
      }
    }

    return output;
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
      track.enabled = true;
    });

    // Use Web Audio API if available for better control
    if (this.audioContext && this.gainNode) {
      try {
        // Clean up previous source if any
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }

        // Create new source from stream
        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.sourceNode.connect(this.gainNode);
        console.log("[WebRTC Audio] ✅ Connected stream to Web Audio API");

        // Resume audio context if suspended
        if (this.audioContext.state === "suspended") {
          this.audioContext
            .resume()
            .then(() => {
              console.log("[WebRTC Audio] ✅ AudioContext resumed");
            })
            .catch((error) => {
              console.warn(
                "[WebRTC Audio] Failed to resume AudioContext:",
                error
              );
              this.setupClickToPlay();
            });
        }
      } catch (error) {
        console.warn(
          "[WebRTC Audio] Web Audio API failed, falling back to audio element:",
          error
        );
        this.playWithAudioElement(stream);
      }
    } else {
      this.playWithAudioElement(stream);
    }
  }

  private playWithAudioElement(stream: MediaStream): void {
    if (!this.audioElement) return;

    this.audioElement.srcObject = stream;
    const playPromise = this.audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("[WebRTC Audio] ✅ Audio element playback started");
          this.audioElement!.muted = false;
        })
        .catch((error) => {
          console.warn("[WebRTC Audio] Autoplay blocked:", error);
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
    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        console.log("[WebRTC Audio] ✅ AudioContext resumed");
      } catch (error) {
        console.warn("[WebRTC Audio] Failed to resume AudioContext:", error);
      }
    }

    if (this.audioElement) {
      try {
        this.audioElement.muted = false;
        this.audioElement.volume = 1.0;
        if (this.audioElement.paused && this.audioElement.srcObject) {
          await this.audioElement.play();
          console.log("[WebRTC Audio] ✅ Audio element resumed");
        }
      } catch (error) {
        console.warn("[WebRTC Audio] Failed to resume audio element:", error);
      }
    }
  }

  setVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = normalizedVolume;
    }
    if (this.audioElement) {
      this.audioElement.volume = normalizedVolume;
    }
  }

  mute(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
    if (this.audioElement) {
      this.audioElement.muted = true;
    }
  }

  unmute(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = 1.0;
    }
    if (this.audioElement) {
      this.audioElement.muted = false;
    }
  }

  // Clear audio queue to reduce latency
  clearQueue(): void {
    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage({ type: "clear-queue" });
    }
    // Also clear ScriptProcessor queue
    this.audioQueue = [];
    this.queuedSamples = 0;
    this.currentBuffer = null;
    this.currentBufferOffset = 0;
  }

  cleanup(): void {
    // Clean up AudioWorklet
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }

    // Clean up ScriptProcessor
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    // Clean up Web Audio API resources
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
      this.audioContext = null;
    }

    // Clean up audio element
    if (this.audioElement) {
      this.audioElement.srcObject = null;
      if (this.audioElement.parentNode) {
        this.audioElement.parentNode.removeChild(this.audioElement);
      }
      this.audioElement = null;
    }

    // Clear queue
    this.audioQueue = [];
    this.queuedSamples = 0;
    this.currentBuffer = null;
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
