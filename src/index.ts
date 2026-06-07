export const packageName = "human-motion-tracking-plugin";

export { CameraManager, VideoFrameProvider } from "./camera/index";
export type { CameraSource, CameraSourceOptions, VideoFrame, VideoFrameCallback } from "./camera/index";
export { EventEmitter, MotionEvents } from "./events/index";
export type { EventHandler, EventMap, MotionEventName, MotionEventPayload } from "./events/index";
export { PoseTracker, TrackerProvider } from "./trackers/index";
export type { MotionLandmarkTracker, PoseTrackerConfig, TrackerProviderConfig, TrackerProviderMode } from "./trackers/index";
export type * from "./types/index";
