import type { PoseResult } from "../types";
import type { MotionLandmarkTracker, PoseTrackerConfig } from "./interfaces";
interface MediaPipeLandmarkLike {
    x: number;
    y: number;
    z?: number;
    visibility?: number;
}
interface MediaPipePoseResultLike {
    landmarks: MediaPipeLandmarkLike[][];
    worldLandmarks?: MediaPipeLandmarkLike[][];
}
export declare function convertPoseLandmarkerResult(result: MediaPipePoseResultLike, timestamp: number): PoseResult | null;
export declare class PoseTracker implements MotionLandmarkTracker {
    #private;
    private readonly config;
    constructor(config: PoseTrackerConfig);
    initialize(): Promise<void>;
    detect(video: HTMLVideoElement, timestamp: number): PoseResult | null;
    dispose(): void;
}
export {};
//# sourceMappingURL=PoseTracker.d.ts.map