/**
 * AudioWorkletProcessor for low-latency WebRTC audio playback
 * Runs on a separate thread isolated from the main UI thread
 * This prevents audio glitches when the main thread is busy
 */

// Type definitions for AudioWorkletGlobalScope
interface AudioWorkletProcessor {
  readonly port: MessagePort;
  process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean;
}

declare var AudioWorkletProcessor: {
  prototype: AudioWorkletProcessor;
  new (options?: any): AudioWorkletProcessor;
};

declare function registerProcessor(
  name: string,
  processorCtor: (new (options?: any) => AudioWorkletProcessor) & {
    parameterDescriptors?: any[];
  }
): void;

interface AudioMessage {
  type: "add-samples" | "get-latency" | "clear-queue";
  samples?: Float32Array;
  sampleRate?: number;
  channels?: number;
}

interface AudioState {
  sampleRate: number;
  channels: number;
  queue: Float32Array[];
  queuedSamples: number;
  currentBuffer: Float32Array | null;
  currentBufferOffset: number;
  maxQueueMs: number;
}

// Global state for the processor (moved inside class for better encapsulation)

class WebRTCAudioWorkletProcessor extends AudioWorkletProcessor {
  private sampleRate: number = 48000;
  private channels: number = 2;
  private queue: Float32Array[] = [];
  private queuedSamples: number = 0;
  private currentBuffer: Float32Array | null = null;
  private currentBufferOffset: number = 0;
  private maxQueueMs: number = 60; // Ultra-low latency: 60ms max buffer

  constructor() {
    super();
    console.log("[AudioWorklet] Processor instantiated");

    // Listen for messages from the main thread
    this.port.onmessage = (event) => {
      const message: AudioMessage = event.data;

      switch (message.type) {
        case "add-samples":
          if (message.samples && message.sampleRate && message.channels) {
            this.sampleRate = message.sampleRate;
            this.channels = message.channels;
            this.addSamples(message.samples);
          }
          break;

        case "get-latency":
          const latencyMs = (this.queuedSamples / this.sampleRate) * 1000;
          this.port.postMessage({
            type: "latency",
            latencyMs,
            queuedSamples: this.queuedSamples,
          });
          break;

        case "clear-queue":
          this.queue = [];
          this.queuedSamples = 0;
          this.currentBuffer = null;
          this.currentBufferOffset = 0;
          break;
      }
    };
  }

  private addSamples(samples: Float32Array): void {
    const channels = this.channels;
    const maxQueueSamples = (this.maxQueueMs / 1000) * this.sampleRate;

    // Drop old samples if queue is too large
    while (this.queuedSamples > maxQueueSamples && this.queue.length > 0) {
      const dropped = this.queue.shift();
      if (dropped) {
        this.queuedSamples -= dropped.length / channels;
      }
    }

    // Add new samples
    this.queue.push(samples);
    this.queuedSamples += samples.length / channels;
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    if (!outputs || !outputs.length) return true;

    const outputL = outputs[0][0];
    const outputR = outputs[0][1];

    if (!outputL) return true;

    const bufferSize = outputL.length;
    const channels = this.channels;

    let outputOffset = 0;

    while (outputOffset < bufferSize) {
      // Get next buffer from queue if needed
      if (
        !this.currentBuffer ||
        this.currentBufferOffset >= this.currentBuffer.length
      ) {
        const nextBuffer = this.queue.shift();
        if (nextBuffer) {
          this.currentBuffer = nextBuffer;
          this.currentBufferOffset = 0;
          this.queuedSamples -= nextBuffer.length / channels;
        } else {
          this.currentBuffer = null;
        }
      }

      if (this.currentBuffer) {
        // Copy samples from current buffer to output
        const samplesAvailable =
          (this.currentBuffer.length - this.currentBufferOffset) / channels;
        const samplesNeeded = bufferSize - outputOffset;
        const samplesToCopy = Math.min(samplesAvailable, samplesNeeded);

        for (let i = 0; i < samplesToCopy; i++) {
          const srcIdx = this.currentBufferOffset + i * channels;
          outputL[outputOffset + i] = this.currentBuffer[srcIdx];
          if (outputR) {
            outputR[outputOffset + i] =
              channels > 1
                ? this.currentBuffer[srcIdx + 1]
                : this.currentBuffer[srcIdx];
          }
        }

        this.currentBufferOffset += samplesToCopy * channels;
        outputOffset += samplesToCopy;
      } else {
        // No data available - output silence
        for (let i = outputOffset; i < bufferSize; i++) {
          outputL[i] = 0;
          if (outputR) outputR[i] = 0;
        }
        break;
      }
    }

    // Keep processor alive
    return true;
  }
}

// Register the processor
registerProcessor("webrtc-audio-processor", WebRTCAudioWorkletProcessor);
