export type TrackerMode = "pose" | "holistic";

export interface CameraConfig {
  deviceId?: string;
  facingMode?: "user" | "environment";
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface GestureConfig {
  enabled: boolean;
  names?: string[];
  minConfidence?: number;
}

export interface ExerciseConfig {
  enabled: boolean;
  names?: string[];
  minConfidence?: number;
}

export interface SmoothingConfig {
  enabled: boolean;
  factor?: number;
  windowSize?: number;
}

export type PerformanceProfile = "low-power" | "balanced" | "quality";

export interface PerformanceConfig {
  targetFps?: number;
  profile?: PerformanceProfile;
  adaptive?: boolean;
}

export interface PoseModelConfig {
  modelAssetPath: string;
  wasmAssetPath: string;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minTrackingConfidence?: number;
  numPoses?: number;
}

export interface MotionTrackerConfig {
  mode: TrackerMode;
  camera: CameraConfig;
  pose?: PoseModelConfig;
  gestures: GestureConfig;
  exercises: ExerciseConfig;
  minConfidence: number;
  smoothing: SmoothingConfig;
  performance?: PerformanceConfig;
}
