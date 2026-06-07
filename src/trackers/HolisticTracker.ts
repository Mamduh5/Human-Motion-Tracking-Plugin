import type { PoseResult } from "../types";
import type { HolisticTrackerConfig, MotionLandmarkTracker } from "./interfaces";

export class HolisticTracker implements MotionLandmarkTracker {
  constructor(private readonly _config: HolisticTrackerConfig = {}) {}

  async initialize(): Promise<void> {
    throw new Error("HolisticTracker is not implemented yet.");
  }

  detect(_video: HTMLVideoElement, _timestamp: number): PoseResult | null {
    throw new Error("HolisticTracker is not implemented yet.");
  }

  dispose(): void {
    // No resources are allocated until holistic tracking is implemented.
  }
}
