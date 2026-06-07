import type { GestureThresholds } from "../detectors/gestures/GestureThresholds";

export type CalibrationPose = "neutral";
export type CalibrationStatus = "idle" | "collecting" | "completed" | "failed" | "cancelled";
export type CalibrationQuality = "poor" | "ok" | "good";

export interface CalibrationOptions {
  durationMs?: number;
  minSamples?: number;
  pose?: CalibrationPose;
  minVisibility?: number;
}

export interface CalibrationMetrics {
  shoulderWidth?: number;
  hipWidth?: number;
  torsoHeight?: number;
  bodyScale?: number;
  leftArmLength?: number;
  rightArmLength?: number;
  averageVisibility: number;
  frontFacingScore?: number;
}

export interface CalibrationResult {
  status: "completed";
  timestamp: number;
  sampleCount: number;
  quality: CalibrationQuality;
  metrics: CalibrationMetrics;
  recommendedThresholds: Partial<GestureThresholds>;
  warnings?: string[];
}

export interface CalibrationProgressEvent {
  status: "collecting";
  elapsedMs: number;
  durationMs: number;
  sampleCount: number;
  quality: CalibrationQuality;
  metrics?: Partial<CalibrationMetrics>;
  warnings?: string[];
}

export interface CalibrationStartedEvent {
  status: "collecting";
  timestamp: number;
  durationMs: number;
  options: Required<CalibrationOptions>;
}

export interface CalibrationFailedEvent {
  status: "failed";
  timestamp: number;
  sampleCount: number;
  message: string;
  warnings?: string[];
}

export interface CalibrationCancelledEvent {
  status: "cancelled";
  timestamp: number;
  sampleCount: number;
}
