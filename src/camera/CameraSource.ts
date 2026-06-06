import type { CameraConfig } from "../types";

export interface CameraSourceOptions {
  camera?: CameraConfig;
  constraints?: MediaStreamConstraints;
  videoElement?: HTMLVideoElement;
}

export interface CameraSource {
  start(): Promise<HTMLVideoElement>;
  stop(): void;
  getVideoElement(): HTMLVideoElement;
  isRunning(): boolean;
}
