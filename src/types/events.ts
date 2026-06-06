import type { ExerciseResult } from "./exercises";
import type { GestureResult } from "./gestures";
import type { PoseResult } from "./landmarks";

export type TrackerStatus = "idle" | "starting" | "running" | "stopped" | "error";

export interface TrackerErrorEvent {
  message: string;
  cause?: unknown;
}

export interface TrackerStatusEvent {
  status: TrackerStatus;
}

export interface MotionTrackerEventMap {
  pose: PoseResult;
  gesture: GestureResult;
  exercise: ExerciseResult;
  status: TrackerStatusEvent;
  error: TrackerErrorEvent;
}

export type MotionTrackerEventName = keyof MotionTrackerEventMap;

export interface MotionTrackerEvent<TEventName extends MotionTrackerEventName = MotionTrackerEventName> {
  type: TEventName;
  payload: MotionTrackerEventMap[TEventName];
  timestamp: number;
}
