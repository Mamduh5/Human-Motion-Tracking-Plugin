import { type MotionTrackerDependencies, type MotionTrackerState } from "../../core";
import type { ExerciseResult, GestureResult, MotionTrackerConfig, PoseResult } from "../../types";
export interface UseMotionTrackerOptions {
    autoStart?: boolean;
    dependencies?: MotionTrackerDependencies;
}
export interface UseMotionTrackerResult {
    start: () => Promise<void>;
    stop: () => void;
    state: MotionTrackerState;
    latestPose: PoseResult | null;
    latestGestures: GestureResult[];
    latestExercises: ExerciseResult[];
    error: Error | null;
}
export declare function useMotionTracker(config: MotionTrackerConfig, options?: UseMotionTrackerOptions): UseMotionTrackerResult;
//# sourceMappingURL=useMotionTracker.d.ts.map