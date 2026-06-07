import type { MotionTrackerConfig, PerformanceConfig, PerformanceProfile, PoseModelConfig } from "../types";

const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile = "balanced";
const PROFILE_TARGET_FPS: Record<PerformanceProfile, number> = {
  "low-power": 10,
  balanced: 15,
  quality: 30,
};

export type ResolvedMotionTrackerConfig = MotionTrackerConfig & {
  pose: PoseModelConfig;
  performance: Required<PerformanceConfig>;
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

  return {
    ...config,
    pose: config.pose,
    performance: resolvePerformanceConfig(config.performance),
  };
}

function resolvePerformanceConfig(performance?: PerformanceConfig): Required<PerformanceConfig> {
  const profile = performance?.profile ?? DEFAULT_PERFORMANCE_PROFILE;
  const targetFps = performance?.targetFps ?? PROFILE_TARGET_FPS[profile];

  if (!Number.isFinite(targetFps) || targetFps <= 0) {
    throw new Error("MotionTrackerConfig.performance.targetFps must be a positive number.");
  }

  return {
    profile,
    targetFps,
    adaptive: performance?.adaptive ?? false,
  };
}
