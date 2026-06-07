export type MotionTrackerStatus = "idle" | "starting" | "running" | "stopped" | "error";

export interface MotionTrackerState {
  status: MotionTrackerStatus;
  startedAt?: number;
  stoppedAt?: number;
  lastFrameTimestamp?: number;
  lastDetectionTimestamp?: number;
  averageDetectionMs?: number;
  framesSkipped?: number;
  detectionsPerSecond?: number;
  error?: Error;
}

export function createInitialTrackerState(): MotionTrackerState {
  return {
    status: "idle",
    framesSkipped: 0,
    detectionsPerSecond: 0,
  };
}
