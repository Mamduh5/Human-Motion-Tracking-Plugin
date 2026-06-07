export interface VideoFrame {
  video: HTMLVideoElement;
  timestamp: number;
  width: number;
  height: number;
}

export type VideoFrameCallback = (frame: VideoFrame) => void;

export class VideoFrameProvider {
  constructor(private readonly videoElement: HTMLVideoElement) {}

  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  getFrame(timestamp = performance.now()): VideoFrame {
    return {
      video: this.videoElement,
      timestamp,
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  requestFrame(callback: VideoFrameCallback): number {
    const requestVideoFrameCallback = this.videoElement.requestVideoFrameCallback;

    if (typeof requestVideoFrameCallback === "function") {
      return requestVideoFrameCallback.call(this.videoElement, (timestamp) => {
        callback(this.getFrame(timestamp));
      });
    }

    return requestAnimationFrame((timestamp) => {
      callback(this.getFrame(timestamp));
    });
  }
}
