import { HolisticTracker } from "./HolisticTracker";
import { PoseTracker } from "./PoseTracker";
import type { HolisticTrackerConfig, MotionLandmarkTracker, PoseTrackerConfig, TrackerProviderMode } from "./interfaces";

export interface TrackerProviderConfig {
  mode: TrackerProviderMode;
  pose?: PoseTrackerConfig;
  holistic?: HolisticTrackerConfig;
}

export class TrackerProvider {
  static create(config: TrackerProviderConfig): MotionLandmarkTracker {
    if (config.mode === "pose") {
      if (!config.pose) {
        throw new Error("TrackerProviderConfig.pose is required for pose tracking.");
      }

      return new PoseTracker(config.pose);
    }

    if (config.mode === "holistic") {
      return new HolisticTracker(config.holistic);
    }

    throw new Error(`Unsupported tracker mode: ${String(config.mode)}`);
  }
}
