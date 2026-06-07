import type { PoseResult } from "../types";
import type { HolisticTrackerConfig, MotionLandmarkTracker } from "./interfaces";
export declare class HolisticTracker implements MotionLandmarkTracker {
    private readonly _config;
    constructor(_config?: HolisticTrackerConfig);
    initialize(): Promise<void>;
    detect(_video: HTMLVideoElement, _timestamp: number): PoseResult | null;
    dispose(): void;
}
//# sourceMappingURL=HolisticTracker.d.ts.map