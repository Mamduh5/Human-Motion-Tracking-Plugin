import type { PoseResult } from "../types";

export interface MotionLandmarkTracker {
  initialize(): Promise<void>;
  detect(video: HTMLVideoElement, timestamp: number): PoseResult | null;
  dispose(): void;
}

export interface PoseTrackerConfig {
  modelAssetPath: string;
  wasmAssetPath: string;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  numPoses?: number;
}

export type TrackerProviderMode = "pose";
