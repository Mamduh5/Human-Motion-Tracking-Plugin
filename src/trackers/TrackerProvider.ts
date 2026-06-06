import { PoseTracker } from "./PoseTracker";
import type { MotionLandmarkTracker, PoseTrackerConfig, TrackerProviderMode } from "./interfaces";

export interface TrackerProviderConfig {
  mode: TrackerProviderMode;
  pose: PoseTrackerConfig;
}

export class TrackerProvider {
  static create(config: TrackerProviderConfig): MotionLandmarkTracker {
    if (config.mode === "pose") {
      return new PoseTracker(config.pose);
    }

    throw new Error(`Unsupported tracker mode: ${String(config.mode)}`);
  }
}
