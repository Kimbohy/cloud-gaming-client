/**
 * AudioWorkletProcessor for low-latency WebRTC audio playback
 * Runs on a separate thread isolated from the main UI thread
 * This prevents audio glitches when the main thread is busy
 * 
 * Now includes ADPCM decoding to offload from main thread
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
  type: "add-samples" | "add-adpcm" | "get-latency" | "clear-queue";
  samples?: Float32Array;
  adpcmData?: Uint8Array;
  sampleRate?: number;
  targetSampleRate?: number;
  channels?: number;
}

// IMA ADPCM Tables (same as server-side)
const ADPCM_INDEX_TABLE = [
  -1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8,
];

const ADPCM_STEP_TABLE = [
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230,
  253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963,
  1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024,
  3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493,
  10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086,
  29794, 32767,
];

class WebRTCAudioWorkletProcessor extends AudioWorkletProcessor {
  private sampleRate: number = 48000;
  private channels: number = 2;
  private queue: Float32Array[] = [];
  private queuedSamples: number = 0;
  private currentBuffer: Float32Array | null = null;
  private currentBufferOffset: number = 0;
  private maxQueueMs: number = 80; // Slightly increased for stability on slow devices

  constructor() {
    super();

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

        case "add-adpcm":
          if (message.adpcmData && message.sampleRate && message.channels) {
            this.channels = message.channels;
            // Decode ADPCM in the audio thread (offloads main thread)
            let decoded = this.decodeADPCM(message.adpcmData, message.channels);
            
            // Resample if needed (e.g., 32000Hz -> 48000Hz)
            const targetRate = message.targetSampleRate || message.sampleRate;
            if (message.sampleRate !== targetRate) {
              decoded = this.resample(decoded, message.sampleRate, targetRate, message.channels);
            }
            this.sampleRate = targetRate;
            this.addSamples(decoded);
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

  /**
   * Decode IMA ADPCM to Float32 PCM
   * This runs in the audio thread, freeing the main thread
   */
  private decodeADPCM(data: Uint8Array, channels: number): Float32Array {
    let bufferIdx = 0;
    const predictedSample = [0, 0];
    const index = [0, 0];

    // Read initial state from header (4 bytes per channel)
    for (let ch = 0; ch < channels; ch++) {
      const low = data[bufferIdx++];
      const high = data[bufferIdx++];
      predictedSample[ch] = (high << 8) | low;
      if (predictedSample[ch] & 0x8000) predictedSample[ch] -= 0x10000;

      index[ch] = data[bufferIdx++];
      bufferIdx++; // Reserved byte
    }

    const dataLen = data.length - bufferIdx;
    const samplesCount = dataLen * 2;
    const output = new Float32Array(samplesCount);

    let outIdx = 0;

    // Decode ADPCM nibbles
    for (let i = 0; i < dataLen; i++) {
      const byte = data[bufferIdx++];

      for (let nibble = 0; nibble < 2; nibble++) {
        const delta = nibble === 0 ? byte & 0x0f : (byte >> 4) & 0x0f;
        const ch = outIdx % channels;

        const step = ADPCM_STEP_TABLE[index[ch]];
        let vpdiff = step >> 3;

        if ((delta & 4) !== 0) vpdiff += step;
        if ((delta & 2) !== 0) vpdiff += step >> 1;
        if ((delta & 1) !== 0) vpdiff += step >> 2;

        if ((delta & 8) !== 0) predictedSample[ch] -= vpdiff;
        else predictedSample[ch] += vpdiff;

        // Clamp to 16-bit range
        if (predictedSample[ch] > 32767) predictedSample[ch] = 32767;
        else if (predictedSample[ch] < -32768) predictedSample[ch] = -32768;

        // Convert Int16 to Float32 directly (avoids extra conversion step)
        output[outIdx++] = predictedSample[ch] / 32768.0;

        // Update index
        index[ch] += ADPCM_INDEX_TABLE[delta & 7];
        if (index[ch] < 0) index[ch] = 0;
        else if (index[ch] > 88) index[ch] = 88;
      }
    }

    return output;
  }

  /**
   * Simple linear interpolation resampling
   * Converts between sample rates (e.g., 32000Hz -> 48000Hz)
   */
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
