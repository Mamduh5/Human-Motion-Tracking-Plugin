import type { MotionTrackerConfig, PoseModelConfig } from "../types";

export type ResolvedMotionTrackerConfig = MotionTrackerConfig & {
  pose: PoseModelConfig;
};

export function resolveMotionTrackerConfig(config: MotionTrackerConfig): ResolvedMotionTrackerConfig {
  if (config.mode !== "pose") {
    throw new Error("Only pose tracking is currently supported. Holistic tracking is not implemented yet.");
  }

  if (!config.pose?.modelAssetPath) {
    throw new Error("MotionTrackerConfig.pose.modelAssetPath is required for pose tracking.");
  }

  if (!config.pose.wasmAssetPath) {
    throw new Error("MotionTrackerConfig.pose.wasmAssetPath is required for pose tracking.");
  }

  return config as ResolvedMotionTrackerConfig;
}
