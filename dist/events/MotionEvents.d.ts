import type { MotionTrackerEventMap, MotionTrackerEventName } from "../types";
export declare const MotionEvents: {
    readonly Pose: "pose";
    readonly Gesture: "gesture";
    readonly Exercise: "exercise";
    readonly Error: "error";
    readonly Started: "started";
    readonly Stopped: "stopped";
};
export type MotionEventName = MotionTrackerEventName;
export type MotionEventPayload<TEventName extends MotionEventName> = MotionTrackerEventMap[TEventName];
//# sourceMappingURL=MotionEvents.d.ts.map