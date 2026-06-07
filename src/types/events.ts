import type {
  CalibrationCancelledEvent,
  CalibrationFailedEvent,
  CalibrationProgressEvent,
  CalibrationResult,
  CalibrationStartedEvent,
} from "./calibration";
import type { ExerciseResult } from "./exercises";
import type { GestureResult } from "./gestures";
import type { HandResult } from "./hands";
import type { PoseResult } from "./landmarks";

export type TrackerStatus = "idle" | "starting" | "running" | "stopped" | "error";

export interface TrackerErrorEvent {
  message: string;
  cause?: unknown;
}

export interface TrackerStatusEvent {
  status: TrackerStatus;
}

export interface TrackerLifecycleEvent {
  timestamp: number;
}

export interface GestureDebugEvent {
  gesture: GestureResult;
  passedMinConfidence: boolean;
  stabilityEmitted: boolean;
  stableGesture?: GestureResult;
  minConfidence: number;
}

export interface HandsDebugEvent {
  result: HandResult | null;
  detected: boolean;
  detectionMs?: number;
  skipped: boolean;
  reason?: string;
}

export interface MotionTrackerEventMap {
  pose: PoseResult;
  hands: HandResult;
  handsDebug: HandsDebugEvent;
  gesture: GestureResult;
  gestureDebug: GestureDebugEvent;
  exercise: ExerciseResult;
  error: TrackerErrorEvent;
  started: TrackerLifecycleEvent;
  stopped: TrackerLifecycleEvent;
  calibrationStarted: CalibrationStartedEvent;
  calibrationProgress: CalibrationProgressEvent;
  calibrationCompleted: CalibrationResult;
  calibrationFailed: CalibrationFailedEvent;
  calibrationCancelled: CalibrationCancelledEvent;
}

export type MotionTrackerEventName = keyof MotionTrackerEventMap;

export interface MotionTrackerEvent<TEventName extends MotionTrackerEventName = MotionTrackerEventName> {
  type: TEventName;
  payload: MotionTrackerEventMap[TEventName];
  timestamp: number;
}
