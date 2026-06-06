export type MotionTrackerStatus = "idle" | "starting" | "running" | "stopped" | "error";

export interface MotionTrackerState {
  status: MotionTrackerStatus;
  startedAt?: number;
  stoppedAt?: number;
  lastFrameTimestamp?: number;
  error?: Error;
}

export function createInitialTrackerState(): MotionTrackerState {
  return {
    status: "idle",
  };
}
