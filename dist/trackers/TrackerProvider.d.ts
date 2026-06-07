import type { HolisticTrackerConfig, MotionLandmarkTracker, PoseTrackerConfig, TrackerProviderMode } from "./interfaces";
export interface TrackerProviderConfig {
    mode: TrackerProviderMode;
    pose?: PoseTrackerConfig;
    holistic?: HolisticTrackerConfig;
}
export declare class TrackerProvider {
    static create(config: TrackerProviderConfig): MotionLandmarkTracker;
}
//# sourceMappingURL=TrackerProvider.d.ts.map