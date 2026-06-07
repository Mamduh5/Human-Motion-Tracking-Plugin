import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, isLandmarkVisible } from "../../utils";

const MIN_VISIBILITY = 0.5;
const HAND_UP_Y_MARGIN = 0.03;
const MIN_FRONT_FACING_TORSO_WIDTH = 0.12;

type HandSide = "left" | "right";
type InactiveReason = "missing-landmarks" | "low-visibility" | "not-front-facing" | "not-high-enough";

export function detectLeftHandUp(pose: PoseResult): GestureResult {
  return detectHandUp(pose, "left");
}

export function detectRightHandUp(pose: PoseResult): GestureResult {
  return detectHandUp(pose, "right");
}

export function detectBothHandsUp(pose: PoseResult): GestureResult {
  const left = getRequiredLandmarks(pose, "left");
  const right = getRequiredLandmarks(pose, "right");

  if (!left.wrist || !left.shoulder || !right.wrist || !right.shoulder) {
    return createGestureResult("bothHandsUp", pose.timestamp, false, 0, { reason: "missing-landmarks" });
  }

  const landmarks = [left.wrist, left.shoulder, right.wrist, right.shoulder];
  const confidence = averageConfidence(landmarks);
  const inactiveReason = getHandUpInactiveReason(pose, landmarks, [
    [left.wrist, left.shoulder],
    [right.wrist, right.shoulder],
  ]);

  return createGestureResult(
    "bothHandsUp",
    pose.timestamp,
    !inactiveReason,
    confidence,
    inactiveReason ? { reason: inactiveReason } : undefined,
  );
}

function detectHandUp(pose: PoseResult, side: HandSide): GestureResult {
  const { wrist, shoulder } = getRequiredLandmarks(pose, side);
  const name = side === "left" ? "leftHandUp" : "rightHandUp";

  if (!wrist || !shoulder) {
    return createGestureResult(name, pose.timestamp, false, 0, { reason: "missing-landmarks" });
  }

  const landmarks = [wrist, shoulder];
  const confidence = averageConfidence(landmarks);
  const inactiveReason = getHandUpInactiveReason(pose, landmarks, [[wrist, shoulder]]);

  return createGestureResult(
    name,
    pose.timestamp,
    !inactiveReason,
    confidence,
    inactiveReason ? { reason: inactiveReason } : undefined,
  );
}

function getRequiredLandmarks(pose: PoseResult, side: HandSide): { wrist?: Landmark; shoulder?: Landmark } {
  return {
    wrist: getLandmarkByName(pose.landmarks, `${side}Wrist`),
    shoulder: getLandmarkByName(pose.landmarks, `${side}Shoulder`),
  };
}

function getHandUpInactiveReason(
  pose: PoseResult,
  landmarks: Landmark[],
  wristShoulderPairs: Array<[Landmark, Landmark]>,
): InactiveReason | undefined {
  if (isSideFacing(pose)) {
    return "not-front-facing";
  }

  if (!landmarks.every((landmark) => isLandmarkVisible(landmark, MIN_VISIBILITY))) {
    return "low-visibility";
  }

  if (!wristShoulderPairs.every(([wrist, shoulder]) => isWristClearlyAboveShoulder(wrist, shoulder))) {
    return "not-high-enough";
  }

  return undefined;
}

function isWristClearlyAboveShoulder(wrist: Landmark, shoulder: Landmark): boolean {
  return wrist.y < shoulder.y - HAND_UP_Y_MARGIN;
}

function isSideFacing(pose: PoseResult): boolean {
  const shoulderWidth = getHorizontalWidth(pose, "leftShoulder", "rightShoulder");
  const hipWidth = getHorizontalWidth(pose, "leftHip", "rightHip");
  const availableWidths = [shoulderWidth, hipWidth].filter((width): width is number => typeof width === "number");

  if (availableWidths.length === 0) {
    return false;
  }

  return Math.max(...availableWidths) < MIN_FRONT_FACING_TORSO_WIDTH;
}

function getHorizontalWidth(pose: PoseResult, leftLandmarkName: string, rightLandmarkName: string): number | undefined {
  const left = getLandmarkByName(pose.landmarks, leftLandmarkName);
  const right = getLandmarkByName(pose.landmarks, rightLandmarkName);

  if (!left || !right || !isLandmarkVisible(left, MIN_VISIBILITY) || !isLandmarkVisible(right, MIN_VISIBILITY)) {
    return undefined;
  }

  return Math.abs(left.x - right.x);
}

function createGestureResult(
  name: string,
  timestamp: number,
  active: boolean,
  confidence: number,
  metadata?: Record<string, unknown>,
): GestureResult {
  return {
    name,
    active,
    confidence,
    timestamp,
    metadata,
  };
}
