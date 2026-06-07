import type { PoseResult } from "../types";
import type { PoseModelConfig } from "../types/config";

export interface MotionLandmarkTracker {
  initialize(): Promise<void>;
  detect(video: HTMLVideoElement, timestamp: number): PoseResult | null;
  dispose(): void;
}

export type PoseTrackerConfig = PoseModelConfig;

export interface HolisticTrackerConfig {
  modelAssetPath?: string;
  wasmAssetPath?: string;
}

export type TrackerProviderMode = "pose" | "holistic";
