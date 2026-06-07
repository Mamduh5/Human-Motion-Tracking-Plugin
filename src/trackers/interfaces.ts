import type { HandResult, PoseResult } from "../types";
import type { HandTrackingConfig, PoseModelConfig } from "../types/config";

export interface MotionLandmarkTracker {
  initialize(): Promise<void>;
  detect(video: HTMLVideoElement, timestamp: number): PoseResult | null;
  dispose(): void;
}

export interface HandLandmarkTracker {
  initialize(): Promise<void>;
  detect(video: HTMLVideoElement, timestamp: number): HandResult | null;
  dispose(): void;
}

export type PoseTrackerConfig = PoseModelConfig;
export type HandTrackerConfig = Required<Pick<HandTrackingConfig, "modelAssetPath" | "wasmAssetPath">> &
  Omit<HandTrackingConfig, "modelAssetPath" | "wasmAssetPath" | "enabled" | "targetFps">;

export interface HolisticTrackerConfig {
  modelAssetPath?: string;
  wasmAssetPath?: string;
}

export type TrackerProviderMode = "pose" | "holistic";
