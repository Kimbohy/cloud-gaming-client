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
  private audioDataChannel: RTCDataChannel | null = null;
  private webrtcSessionId: string | null = null;
  private _gameSessionId: string | null = null;

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

    for (let ch = 0; ch < channels; ch++) {
      const low = data[bufferIdx++];
      const high = data[bufferIdx++];
      predictedSample[ch] = (high << 8) | low;
      if (predictedSample[ch] & 0x8000) predictedSample[ch] -= 0x10000;

      index[ch] = data[bufferIdx++];
      bufferIdx++;
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
        iceServers: this.iceServers,
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
          audioData = this.decodeADPCM(adpcmData, channels);
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

    this.dataChannel.onmessage = (event) => {};
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

export class WebRTCVideoRenderer {
  private videoElement: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private abortController: AbortController | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext("2d", {
      alpha: false,
      desynchronized: true,
    });
  }

  setVideoStream(stream: MediaStream): void {
    if (!this.canvas || !this.context) return;

    this.cleanup();

    stream.getVideoTracks().forEach((track) => {
      if ("contentHint" in track) {
        (track as any).contentHint = "motion";
      }
    });

    if ("MediaStreamTrackProcessor" in window) {
      this.renderWithWebCodecs(stream);
    } else {
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
            this.context.drawImage(
              frame,
              0,
              0,
              this.canvas.width,
              this.canvas.height
            );
          }
          frame.close();
        }
      }
      reader.releaseLock();
    } catch (error) {
      console.error("[WebRTC Video] WebCodecs error:", error);
      if (!signal.aborted) {
        this.renderWithVideoElement(stream);
      }
    }
  }

  private renderWithVideoElement(stream: MediaStream): void {
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
          (this.videoElement as any).requestVideoFrameCallback(
            renderVideoFrame
          );
        }
      };
      (this.videoElement as any).requestVideoFrameCallback(renderVideoFrame);
    } else {
      const render = () => {
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
  }
}

import audioWorkletUrl from "../lib/audio-worklet-processor.ts?worker&url";

export class WebRTCAudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;

  private audioWorkletNode: AudioWorkletNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private audioQueue: Float32Array[] = [];
  private queuedSamples: number = 0;
  private currentBuffer: Float32Array | null = null;
  private currentBufferOffset: number = 0;
  private lastUnderrun: number = 0;
  private maxQueueMs: number = 60;
  private channels: number = 2;

  async initialize(): Promise<void> {
    this.audioElement = document.createElement("audio");
    this.audioElement.autoplay = true;
    this.audioElement.muted = true;
    this.audioElement.volume = 1.0;
    this.audioElement.style.display = "none";
    document.body.appendChild(this.audioElement);

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      this.audioContext = new AudioContextClass({
        latencyHint: "interactive",
        sampleRate: 48000,
      });

      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 1.0;

      try {
        await this.audioContext.audioWorklet.addModule(audioWorkletUrl);

        this.audioWorkletNode = new AudioWorkletNode(
          this.audioContext,
          "webrtc-audio-processor",
          {
            outputChannelCount: [2],
          }
        );

        this.audioWorkletNode.connect(this.gainNode);

        this.audioWorkletNode.port.onmessage = (event) => {
          if (event.data.type === "latency") {
          }
        };
      } catch (e) {
        console.error(
          "[WebRTC Audio] Failed to load AudioWorklet, falling back to ScriptProcessor:",
          e
        );

        const bufferSize = 512;
        this.scriptProcessor = this.audioContext.createScriptProcessor(
          bufferSize,
          0,
          2
        );

        this.scriptProcessor.onaudioprocess = (event) => {
          this.processAudio(event);
        };

        this.scriptProcessor.connect(this.gainNode);
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
  }

  private processAudio(event: AudioProcessingEvent): void {
    const outputL = event.outputBuffer.getChannelData(0);
    const outputR = event.outputBuffer.getChannelData(1);
    const bufferSize = outputL.length;

    let outputOffset = 0;
    let hadUnderrun = false;

    while (outputOffset < bufferSize) {
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
        hadUnderrun = true;
        for (let i = outputOffset; i < bufferSize; i++) {
          outputL[i] = 0;
          outputR[i] = 0;
        }
        break;
      }
    }

    if (hadUnderrun) {
      const now = Date.now();
      if (now - this.lastUnderrun > 1000) {
        this.lastUnderrun = now;
      }
    }
  }

  playPCMAudio(audioData: {
    samples: Int16Array;
    sampleRate: number;
    channels: number;
  }): void {
    if (!this.audioContext) {
      return;
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume().catch(console.error);
      return;
    }

    const { samples, sampleRate, channels } = audioData;
    this.channels = channels;

    if (samples.length === 0) return;

    const float32Array = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      float32Array[i] = samples[i] / 32768.0;
    }

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

    if (this.audioWorkletNode) {
      this.audioWorkletNode.port.postMessage(
        {
          type: "add-samples",
          samples: processedSamples,
          sampleRate: this.audioContext.sampleRate,
          channels: channels,
        },
        [processedSamples.buffer]
      );
    } else if (this.scriptProcessor) {
      const maxQueueSamples =
        (this.maxQueueMs / 1000) * this.audioContext.sampleRate;
      while (
        this.queuedSamples > maxQueueSamples &&
        this.audioQueue.length > 0
      ) {
        const dropped = this.audioQueue.shift();
        if (dropped) {
          this.queuedSamples -= dropped.length / channels;
        }
      }

      this.audioQueue.push(processedSamples);
      this.queuedSamples += processedSamples.length / channels;
    }
  }

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

    if (this.audioContext && this.gainNode) {
      try {
        if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
        }

        this.sourceNode = this.audioContext.createMediaStreamSource(stream);
        this.sourceNode.connect(this.gainNode);

        if (this.audioContext.state === "suspended") {
          this.audioContext
            .resume()
            .then(() => {})
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
