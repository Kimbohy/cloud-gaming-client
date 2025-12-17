import audioWorkletUrl from "../../lib/audio-worklet-processor.ts?worker&url";

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
