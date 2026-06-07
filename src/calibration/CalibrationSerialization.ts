import type { GestureThresholds } from "../detectors/gestures/GestureThresholds";
import type { CalibrationMetrics, CalibrationQuality, CalibrationResult } from "../types";

const CALIBRATION_QUALITIES: CalibrationQuality[] = ["poor", "ok", "good"];
const CALIBRATION_METRIC_KEYS: Array<keyof CalibrationMetrics> = [
  "shoulderWidth",
  "hipWidth",
  "torsoHeight",
  "bodyScale",
  "leftArmLength",
  "rightArmLength",
  "averageVisibility",
  "frontFacingScore",
];
const GESTURE_THRESHOLD_KEYS: Array<keyof GestureThresholds> = [
  "minVisibility",
  "handUpYMargin",
  "frontFacingScore",
  "armsOpenYOffset",
  "armsOpenXMargin",
  "armExtensionAngle",
  "elbowBentAngle",
  "armAngleTolerance",
  "handsOnHipsDistance",
  "crossedArmsDistance",
];

export function serializeCalibration(result: CalibrationResult): string {
  if (!validateCalibrationResult(result)) {
    throw new Error("Invalid calibration result.");
  }

  return JSON.stringify(result);
}

export function parseCalibration(value: string): CalibrationResult {
  try {
    const parsedValue: unknown = JSON.parse(value);

    if (!validateCalibrationResult(parsedValue)) {
      throw new Error("Invalid calibration data.");
    }

    return parsedValue;
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid calibration data.") {
      throw error;
    }

    throw new Error("Invalid calibration data.");
  }
}

export function validateCalibrationResult(value: unknown): value is CalibrationResult {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.status !== "completed" ||
    !isFiniteNumber(value.timestamp) ||
    !isNonNegativeInteger(value.sampleCount) ||
    !CALIBRATION_QUALITIES.includes(value.quality as CalibrationQuality) ||
    !validateCalibrationMetrics(value.metrics) ||
    !validateRecommendedThresholds(value.recommendedThresholds)
  ) {
    return false;
  }

  return value.warnings === undefined || (Array.isArray(value.warnings) && value.warnings.every((warning) => typeof warning === "string"));
}

function validateCalibrationMetrics(value: unknown): value is CalibrationMetrics {
  if (!isRecord(value) || !isFiniteNumber(value.averageVisibility)) {
    return false;
  }

  return Object.entries(value).every(([key, metricValue]) => {
    return CALIBRATION_METRIC_KEYS.includes(key as keyof CalibrationMetrics) && isFiniteNumber(metricValue);
  });
}

function validateRecommendedThresholds(value: unknown): value is Partial<GestureThresholds> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).every(([key, thresholdValue]) => {
    return GESTURE_THRESHOLD_KEYS.includes(key as keyof GestureThresholds) && isFiniteNumber(thresholdValue);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
