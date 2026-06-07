import type {
  GestureConfig,
  GestureStabilityConfig,
  MotionTrackerConfig,
  PerformanceConfig,
  PerformanceProfile,
  PoseModelConfig,
} from "../types";

const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile = "balanced";
const PROFILE_TARGET_FPS: Record<PerformanceProfile, number> = {
  "low-power": 10,
  balanced: 15,
  quality: 30,
};

export type ResolvedMotionTrackerConfig = MotionTrackerConfig & {
  pose: PoseModelConfig;
  performance: Required<PerformanceConfig>;
  gestures: GestureConfig & {
    stability: Required<GestureStabilityConfig>;
  };
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
    gestures: resolveGestureConfig(config.gestures),
    performance: resolvePerformanceConfig(config.performance),
  };
}

function resolveGestureConfig(gestures: GestureConfig): ResolvedMotionTrackerConfig["gestures"] {
  const stability = gestures.stability ?? {};
  const activeFrames = stability.activeFrames ?? 3;
  const inactiveFrames = stability.inactiveFrames ?? 3;

  if (!Number.isInteger(activeFrames) || activeFrames <= 0) {
    throw new Error("MotionTrackerConfig.gestures.stability.activeFrames must be a positive integer.");
  }

  if (!Number.isInteger(inactiveFrames) || inactiveFrames <= 0) {
    throw new Error("MotionTrackerConfig.gestures.stability.inactiveFrames must be a positive integer.");
  }

  return {
    ...gestures,
    stability: {
      enabled: stability.enabled ?? true,
      activeFrames,
      inactiveFrames,
    },
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
