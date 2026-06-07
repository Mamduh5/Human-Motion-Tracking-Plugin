import type {
  GestureConfig,
  GestureStabilityConfig,
  HandTrackingConfig,
  MotionTrackerConfig,
  PerformanceConfig,
  PerformanceProfile,
  PoseModelConfig,
} from "../types";
import { resolveGestureThresholds, type GestureThresholds } from "../detectors/gestures/GestureThresholds";

const DEFAULT_PERFORMANCE_PROFILE: PerformanceProfile = "balanced";
const PROFILE_TARGET_FPS: Record<PerformanceProfile, number> = {
  "low-power": 10,
  balanced: 15,
  quality: 30,
};
const DEFAULT_HAND_TARGET_FPS = 10;
const DEFAULT_NUM_HANDS = 2;

type ResolvedHandTrackingConfig = HandTrackingConfig & {
  enabled: boolean;
  numHands: number;
  targetFps: number;
  smoothing: {
    enabled: boolean;
    factor: number;
  };
  identitySmoothing: boolean;
};

export type ResolvedMotionTrackerConfig = MotionTrackerConfig & {
  pose: PoseModelConfig;
  performance: Required<PerformanceConfig>;
  hands: ResolvedHandTrackingConfig;
  gestures: GestureConfig & {
    precision: NonNullable<GestureConfig["precision"]>;
    thresholds: GestureThresholds;
    thresholdOverrides: Partial<GestureThresholds>;
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
    hands: resolveHandTrackingConfig(config.hands),
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
    precision: gestures.precision ?? "balanced",
    thresholds: resolveGestureThresholds(gestures),
    thresholdOverrides: gestures.thresholds ?? {},
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

function resolveHandTrackingConfig(hands?: HandTrackingConfig): ResolvedHandTrackingConfig {
  const enabled = hands?.enabled ?? false;
  const numHands = hands?.numHands ?? DEFAULT_NUM_HANDS;
  const targetFps = hands?.targetFps ?? DEFAULT_HAND_TARGET_FPS;
  const smoothing = hands?.smoothing ?? {};
  const smoothingFactor = smoothing.factor ?? 0.35;

  if (!Number.isInteger(numHands) || numHands <= 0) {
    throw new Error("MotionTrackerConfig.hands.numHands must be a positive integer.");
  }

  if (!Number.isFinite(targetFps) || targetFps <= 0) {
    throw new Error("MotionTrackerConfig.hands.targetFps must be a positive number.");
  }

  if (!Number.isFinite(smoothingFactor) || smoothingFactor <= 0 || smoothingFactor > 1) {
    throw new Error("MotionTrackerConfig.hands.smoothing.factor must be greater than 0 and at most 1.");
  }

  if (enabled && !hands?.modelAssetPath) {
    throw new Error("MotionTrackerConfig.hands.modelAssetPath is required when hand tracking is enabled.");
  }

  if (enabled && !hands?.wasmAssetPath) {
    throw new Error("MotionTrackerConfig.hands.wasmAssetPath is required when hand tracking is enabled.");
  }

  return {
    ...hands,
    enabled,
    numHands,
    targetFps,
    smoothing: {
      enabled: smoothing.enabled ?? false,
      factor: smoothingFactor,
    },
    identitySmoothing: hands?.identitySmoothing ?? true,
  };
}
