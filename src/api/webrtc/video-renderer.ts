// WebRTC Video Renderer

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
