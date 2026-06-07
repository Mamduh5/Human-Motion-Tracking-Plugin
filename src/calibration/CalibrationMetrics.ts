import { getLandmarkByName } from "../normalizers";
import type { GestureThresholds } from "../detectors/gestures/GestureThresholds";
import type { CalibrationMetrics, CalibrationQuality, CalibrationOptions } from "../types";
import type { Landmark, PoseResult } from "../types";
import { distance2D } from "../utils";

export const DEFAULT_CALIBRATION_OPTIONS: Required<CalibrationOptions> = {
  durationMs: 3000,
  minSamples: 15,
  pose: "neutral",
  minVisibility: 0.5,
};

export const CALIBRATION_WARNING_LOW_VISIBILITY = "Low visibility";
export const CALIBRATION_WARNING_MISSING_SHOULDERS = "Missing shoulders";
export const CALIBRATION_WARNING_MISSING_HIPS = "Missing hips";
export const CALIBRATION_WARNING_NOT_FRONT_FACING = "Not front-facing";
export const CALIBRATION_WARNING_TOO_FEW_SAMPLES = "Too few samples";

const REQUIRED_LANDMARK_NAMES = [
  "leftShoulder",
  "rightShoulder",
  "leftHip",
  "rightHip",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
] as const;

const MIN_FRONT_FACING_SCORE = 0.3;

export interface CalibrationSampleMetrics extends Partial<Omit<CalibrationMetrics, "averageVisibility">> {
  averageVisibility: number;
  missingLandmarks: string[];
}

interface CalibrationLandmarks {
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftHip?: Landmark;
  rightHip?: Landmark;
  leftElbow?: Landmark;
  rightElbow?: Landmark;
  leftWrist?: Landmark;
  rightWrist?: Landmark;
}

export function calculateCalibrationSampleMetrics(
  pose: PoseResult,
  minVisibility = DEFAULT_CALIBRATION_OPTIONS.minVisibility,
): CalibrationSampleMetrics {
  const landmarks = getCalibrationLandmarks(pose);
  const { leftShoulder, rightShoulder, leftHip, rightHip, leftElbow, rightElbow, leftWrist, rightWrist } = landmarks;
  let shoulderWidth: number | undefined;
  let hipWidth: number | undefined;
  let torsoHeight: number | undefined;
  let leftArmLength: number | undefined;
  let rightArmLength: number | undefined;

  if (isVisible(leftShoulder, minVisibility) && isVisible(rightShoulder, minVisibility)) {
    shoulderWidth = distance2D(leftShoulder, rightShoulder);

    if (isVisible(leftHip, minVisibility) && isVisible(rightHip, minVisibility)) {
      hipWidth = distance2D(leftHip, rightHip);
      torsoHeight = distance2D(getMidpoint(leftShoulder, rightShoulder), getMidpoint(leftHip, rightHip));
    }
  } else if (isVisible(leftHip, minVisibility) && isVisible(rightHip, minVisibility)) {
    hipWidth = distance2D(leftHip, rightHip);
  }

  if (isVisible(leftShoulder, minVisibility) && isVisible(leftElbow, minVisibility) && isVisible(leftWrist, minVisibility)) {
    leftArmLength = distance2D(leftShoulder, leftElbow) + distance2D(leftElbow, leftWrist);
  }

  if (isVisible(rightShoulder, minVisibility) && isVisible(rightElbow, minVisibility) && isVisible(rightWrist, minVisibility)) {
    rightArmLength = distance2D(rightShoulder, rightElbow) + distance2D(rightElbow, rightWrist);
  }
  const frontFacingScore = torsoHeight && torsoHeight > 0 ? Math.max(shoulderWidth ?? 0, hipWidth ?? 0) / torsoHeight : undefined;

  return {
    shoulderWidth,
    hipWidth,
    torsoHeight,
    leftArmLength,
    rightArmLength,
    averageVisibility: getAverageRequiredVisibility(pose),
    frontFacingScore,
    missingLandmarks: REQUIRED_LANDMARK_NAMES.filter((name) => !getLandmarkByName(pose.landmarks, name)),
  };
}

export function isCalibrationSampleUsable(
  sample: CalibrationSampleMetrics,
  minVisibility = DEFAULT_CALIBRATION_OPTIONS.minVisibility,
): boolean {
  return (
    sample.averageVisibility >= minVisibility &&
    Boolean(sample.shoulderWidth || sample.torsoHeight || sample.leftArmLength || sample.rightArmLength)
  );
}

export function summarizeCalibrationMetrics(samples: CalibrationSampleMetrics[]): CalibrationMetrics | undefined {
  if (samples.length === 0) {
    return undefined;
  }

  const shoulderWidth = medianBy(samples, "shoulderWidth");
  const hipWidth = medianBy(samples, "hipWidth");
  const torsoHeight = medianBy(samples, "torsoHeight");
  const leftArmLength = medianBy(samples, "leftArmLength");
  const rightArmLength = medianBy(samples, "rightArmLength");
  const frontFacingScore = medianBy(samples, "frontFacingScore");
  const bodyScale = median([
    ...samples.map((sample) => sample.shoulderWidth),
    ...samples.map((sample) => sample.torsoHeight),
  ]);

  return {
    shoulderWidth,
    hipWidth,
    torsoHeight,
    bodyScale,
    leftArmLength,
    rightArmLength,
    averageVisibility: average(samples.map((sample) => sample.averageVisibility)),
    frontFacingScore,
  };
}

export function getCalibrationQuality(
  metrics: CalibrationMetrics | undefined,
  sampleCount: number,
  options: Required<CalibrationOptions>,
): CalibrationQuality {
  if (!metrics || sampleCount < options.minSamples || metrics.averageVisibility < options.minVisibility + 0.1) {
    return "poor";
  }

  if (
    metrics.averageVisibility >= 0.75 &&
    Boolean(metrics.shoulderWidth || metrics.torsoHeight) &&
    (metrics.frontFacingScore === undefined || metrics.frontFacingScore >= MIN_FRONT_FACING_SCORE)
  ) {
    return "good";
  }

  return "ok";
}

export function getCalibrationWarnings(
  metrics: CalibrationMetrics | undefined,
  sampleCount: number,
  options: Required<CalibrationOptions>,
): string[] {
  const warnings: string[] = [];

  if (sampleCount < options.minSamples) {
    warnings.push(CALIBRATION_WARNING_TOO_FEW_SAMPLES);
  }

  if (!metrics) {
    warnings.push(CALIBRATION_WARNING_LOW_VISIBILITY);
    warnings.push(CALIBRATION_WARNING_MISSING_SHOULDERS);
    warnings.push(CALIBRATION_WARNING_MISSING_HIPS);
    return warnings;
  }

  if (metrics.averageVisibility < Math.min(0.7, options.minVisibility + 0.15)) {
    warnings.push(CALIBRATION_WARNING_LOW_VISIBILITY);
  }

  if (!metrics.shoulderWidth) {
    warnings.push(CALIBRATION_WARNING_MISSING_SHOULDERS);
  }

  if (!metrics.hipWidth || !metrics.torsoHeight) {
    warnings.push(CALIBRATION_WARNING_MISSING_HIPS);
  }

  if (metrics.frontFacingScore !== undefined && metrics.frontFacingScore < MIN_FRONT_FACING_SCORE) {
    warnings.push(CALIBRATION_WARNING_NOT_FRONT_FACING);
  }

  return warnings;
}

export function createRecommendedGestureThresholds(
  metrics: CalibrationMetrics,
  quality: CalibrationQuality,
): Partial<GestureThresholds> {
  const bodyScale = metrics.bodyScale ?? metrics.shoulderWidth ?? metrics.torsoHeight;
  const recommendedThresholds: Partial<GestureThresholds> = {
    minVisibility:
      quality === "good"
        ? clamp(metrics.averageVisibility * 0.75, 0.5, 0.7)
        : quality === "ok"
          ? clamp(metrics.averageVisibility * 0.7, 0.45, 0.6)
          : clamp(metrics.averageVisibility * 0.65, 0.35, 0.5),
  };

  if (bodyScale) {
    recommendedThresholds.handUpYMargin = clamp(bodyScale * 0.08, 0.015, 0.055);
  }

  if (metrics.frontFacingScore) {
    recommendedThresholds.frontFacingScore = clamp(metrics.frontFacingScore * 0.75, 0.25, 0.5);
  }

  if (metrics.torsoHeight && bodyScale) {
    recommendedThresholds.handsOnHipsDistance = clamp((metrics.torsoHeight / bodyScale) * 0.5, 0.35, 0.7);
  }

  if (metrics.shoulderWidth) {
    recommendedThresholds.crossedArmsDistance = clamp(0.2 + (0.3 - metrics.shoulderWidth) * 0.25, 0.12, 0.32);
    recommendedThresholds.armsOpenXMargin = clamp(0.04 + (metrics.shoulderWidth - 0.3) * 0.15, -0.02, 0.08);
  }

  return recommendedThresholds;
}

function getCalibrationLandmarks(pose: PoseResult): CalibrationLandmarks {
  return {
    leftShoulder: getLandmarkByName(pose.landmarks, "leftShoulder"),
    rightShoulder: getLandmarkByName(pose.landmarks, "rightShoulder"),
    leftHip: getLandmarkByName(pose.landmarks, "leftHip"),
    rightHip: getLandmarkByName(pose.landmarks, "rightHip"),
    leftElbow: getLandmarkByName(pose.landmarks, "leftElbow"),
    rightElbow: getLandmarkByName(pose.landmarks, "rightElbow"),
    leftWrist: getLandmarkByName(pose.landmarks, "leftWrist"),
    rightWrist: getLandmarkByName(pose.landmarks, "rightWrist"),
  };
}

function getAverageRequiredVisibility(pose: PoseResult): number {
  return average(
    REQUIRED_LANDMARK_NAMES.map((name) => {
      const landmark = getLandmarkByName(pose.landmarks, name);

      return landmark ? (landmark.visibility ?? 1) : 0;
    }),
  );
}

function isVisible(landmark: Landmark | undefined, minVisibility: number): landmark is Landmark {
  return Boolean(landmark && (landmark.visibility ?? 1) >= minVisibility);
}

function getMidpoint(firstLandmark: Landmark, secondLandmark: Landmark): { x: number; y: number } {
  return {
    x: (firstLandmark.x + secondLandmark.x) / 2,
    y: (firstLandmark.y + secondLandmark.y) / 2,
  };
}

function medianBy(samples: CalibrationSampleMetrics[], key: keyof Omit<CalibrationSampleMetrics, "missingLandmarks">): number | undefined {
  return median(samples.map((sample) => sample[key]));
}

function median(values: Array<number | undefined>): number | undefined {
  const sortedValues = values
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    .sort((first, second) => first - second);

  if (sortedValues.length === 0) {
    return undefined;
  }

  const midpoint = Math.floor(sortedValues.length / 2);

  return sortedValues.length % 2 === 0 ? (sortedValues[midpoint - 1] + sortedValues[midpoint]) / 2 : sortedValues[midpoint];
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
