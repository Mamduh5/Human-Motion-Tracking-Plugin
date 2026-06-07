export type GesturePrecisionProfile = "loose" | "balanced" | "strict";

export interface GestureThresholds {
  minVisibility: number;
  handUpYMargin: number;
  frontFacingScore: number;
  armsOpenYOffset: number;
  armsOpenXMargin: number;
  armExtensionAngle: number;
  elbowBentAngle: number;
  armAngleTolerance: number;
  handsOnHipsDistance: number;
  crossedArmsDistance: number;
}

export interface GestureThresholdConfig {
  precision?: GesturePrecisionProfile;
  thresholds?: Partial<GestureThresholds>;
}

export const GESTURE_PRECISION_PRESETS: Record<GesturePrecisionProfile, GestureThresholds> = {
  loose: {
    minVisibility: 0.35,
    handUpYMargin: 0.015,
    frontFacingScore: 0.25,
    armsOpenYOffset: 0.55,
    armsOpenXMargin: -0.05,
    armExtensionAngle: 150,
    elbowBentAngle: 135,
    armAngleTolerance: 20,
    handsOnHipsDistance: 0.7,
    crossedArmsDistance: 0.3,
  },
  balanced: {
    minVisibility: 0.5,
    handUpYMargin: 0.03,
    frontFacingScore: 0.35,
    armsOpenYOffset: 0.4,
    armsOpenXMargin: 0,
    armExtensionAngle: 160,
    elbowBentAngle: 120,
    armAngleTolerance: 10,
    handsOnHipsDistance: 0.55,
    crossedArmsDistance: 0.2,
  },
  strict: {
    minVisibility: 0.65,
    handUpYMargin: 0.06,
    frontFacingScore: 0.45,
    armsOpenYOffset: 0.28,
    armsOpenXMargin: 0.12,
    armExtensionAngle: 175,
    elbowBentAngle: 105,
    armAngleTolerance: 5,
    handsOnHipsDistance: 0.4,
    crossedArmsDistance: 0.1,
  },
};

export function resolveGestureThresholds(config: GestureThresholdConfig = {}): GestureThresholds {
  const precision = config.precision ?? "balanced";

  return {
    ...GESTURE_PRECISION_PRESETS[precision],
    ...config.thresholds,
  };
}
