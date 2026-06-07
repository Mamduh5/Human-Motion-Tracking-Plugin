import type { MotionTrackerConfig, PoseModelConfig } from "../types";
export type ResolvedMotionTrackerConfig = MotionTrackerConfig & {
    pose: PoseModelConfig;
};
export declare function resolveMotionTrackerConfig(config: MotionTrackerConfig): ResolvedMotionTrackerConfig;
//# sourceMappingURL=TrackerConfig.d.ts.map