import type { MotionTrackerEventMap, MotionTrackerEventName } from "../types";

export const MotionEvents = {
  Pose: "pose",
  Gesture: "gesture",
  Exercise: "exercise",
  Error: "error",
  Started: "started",
  Stopped: "stopped",
} as const satisfies Record<string, MotionTrackerEventName>;

export type MotionEventName = MotionTrackerEventName;
export type MotionEventPayload<TEventName extends MotionEventName> = MotionTrackerEventMap[TEventName];
