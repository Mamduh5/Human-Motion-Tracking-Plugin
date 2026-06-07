import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, distance2D, isLandmarkVisible } from "../../utils";
import { resolveGestureThresholds, type GestureThresholds } from "./GestureThresholds";

const DEFAULT_THRESHOLDS = resolveGestureThresholds();

export function detectArmsOpen(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  const leftShoulder = getLandmarkByName(pose.landmarks, "leftShoulder");
  const rightShoulder = getLandmarkByName(pose.landmarks, "rightShoulder");
  const leftWrist = getLandmarkByName(pose.landmarks, "leftWrist");
  const rightWrist = getLandmarkByName(pose.landmarks, "rightWrist");

  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
    return createGestureResult(pose.timestamp, false, 0, { reason: "missing-landmarks" });
  }

  const landmarks = [leftShoulder, rightShoulder, leftWrist, rightWrist];
  const shoulderWidth = distance2D(leftShoulder, rightShoulder);

  if (shoulderWidth === 0 || !landmarks.every((landmark) => isLandmarkVisible(landmark, thresholds.minVisibility))) {
    return createGestureResult(pose.timestamp, false, averageConfidence(landmarks), {
      reason: "low-visibility",
      requiredVisibility: getRequiredVisibility({ leftShoulder, rightShoulder, leftWrist, rightWrist }),
    });
  }

  const leftExtended = leftWrist.x < leftShoulder.x - shoulderWidth * thresholds.armsOpenXMargin;
  const rightExtended = rightWrist.x > rightShoulder.x + shoulderWidth * thresholds.armsOpenXMargin;
  const leftLevel = isNearShoulderHeight(leftWrist, leftShoulder, shoulderWidth, thresholds);
  const rightLevel = isNearShoulderHeight(rightWrist, rightShoulder, shoulderWidth, thresholds);
  const active = leftExtended && rightExtended && leftLevel && rightLevel;

  return createGestureResult(
    pose.timestamp,
    active,
    averageConfidence(landmarks),
    {
      reason: active ? "active" : "not-extended",
      shoulderWidth,
      requiredVisibility: getRequiredVisibility({ leftShoulder, rightShoulder, leftWrist, rightWrist }),
    },
  );
}

function isNearShoulderHeight(wrist: Landmark, shoulder: Landmark, shoulderWidth: number, thresholds: GestureThresholds): boolean {
  return Math.abs(wrist.y - shoulder.y) <= shoulderWidth * thresholds.armsOpenYOffset;
}

function getRequiredVisibility(requiredLandmarks: Record<string, Landmark | undefined>): Record<string, number | undefined> {
  return Object.fromEntries(
    Object.entries(requiredLandmarks).map(([name, landmark]) => [name, landmark?.visibility]),
  ) as Record<string, number | undefined>;
}

function createGestureResult(
  timestamp: number,
  active: boolean,
  confidence: number,
  metadata?: Record<string, unknown>,
): GestureResult {
  return {
    name: "armsOpen",
    active,
    confidence,
    timestamp,
    metadata,
  };
}
