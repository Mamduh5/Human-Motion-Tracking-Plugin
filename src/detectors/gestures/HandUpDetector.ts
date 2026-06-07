import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, isLandmarkVisible } from "../../utils";

const MIN_VISIBILITY = 0.5;
const HAND_UP_Y_MARGIN = 0.03;
const MIN_FRONT_FACING_TORSO_WIDTH = 0.12;

type HandSide = "left" | "right";
type InactiveReason = "missing-landmarks" | "low-visibility" | "not-front-facing" | "not-high-enough";
type HandUpReason = InactiveReason | "active";
type HandUpYMetadata = number | Partial<Record<HandSide, number>>;

interface HandUpMetadataOptions {
  reason: HandUpReason;
  requiredLandmarks: Record<string, Landmark | undefined>;
  wristY?: HandUpYMetadata;
  shoulderY?: HandUpYMetadata;
  torsoWidth?: number;
}

interface HandUpEvaluation {
  inactiveReason?: InactiveReason;
  torsoWidth?: number;
}

export function detectLeftHandUp(pose: PoseResult): GestureResult {
  return detectHandUp(pose, "left");
}

export function detectRightHandUp(pose: PoseResult): GestureResult {
  return detectHandUp(pose, "right");
}

export function detectBothHandsUp(pose: PoseResult): GestureResult {
  const left = getRequiredLandmarks(pose, "left");
  const right = getRequiredLandmarks(pose, "right");
  const requiredLandmarks = {
    leftWrist: left.wrist,
    leftShoulder: left.shoulder,
    rightWrist: right.wrist,
    rightShoulder: right.shoulder,
  };

  if (!left.wrist || !left.shoulder || !right.wrist || !right.shoulder) {
    return createGestureResult(
      "bothHandsUp",
      pose.timestamp,
      false,
      0,
      createHandUpMetadata({ reason: "missing-landmarks", requiredLandmarks }),
    );
  }

  const landmarks = [left.wrist, left.shoulder, right.wrist, right.shoulder];
  const confidence = averageConfidence(landmarks);
  const evaluation = evaluateHandUp(pose, landmarks, [
    [left.wrist, left.shoulder],
    [right.wrist, right.shoulder],
  ]);
  const reason = evaluation.inactiveReason ?? "active";

  return createGestureResult(
    "bothHandsUp",
    pose.timestamp,
    !evaluation.inactiveReason,
    confidence,
    createHandUpMetadata({
      reason,
      requiredLandmarks,
      wristY: { left: left.wrist.y, right: right.wrist.y },
      shoulderY: { left: left.shoulder.y, right: right.shoulder.y },
      torsoWidth: evaluation.torsoWidth,
    }),
  );
}

function detectHandUp(pose: PoseResult, side: HandSide): GestureResult {
  const { wrist, shoulder } = getRequiredLandmarks(pose, side);
  const name = side === "left" ? "leftHandUp" : "rightHandUp";
  const requiredLandmarks = {
    [`${side}Wrist`]: wrist,
    [`${side}Shoulder`]: shoulder,
  };

  if (!wrist || !shoulder) {
    return createGestureResult(
      name,
      pose.timestamp,
      false,
      0,
      createHandUpMetadata({ reason: "missing-landmarks", requiredLandmarks }),
    );
  }

  const landmarks = [wrist, shoulder];
  const confidence = averageConfidence(landmarks);
  const evaluation = evaluateHandUp(pose, landmarks, [[wrist, shoulder]]);
  const reason = evaluation.inactiveReason ?? "active";

  return createGestureResult(
    name,
    pose.timestamp,
    !evaluation.inactiveReason,
    confidence,
    createHandUpMetadata({
      reason,
      requiredLandmarks,
      wristY: wrist.y,
      shoulderY: shoulder.y,
      torsoWidth: evaluation.torsoWidth,
    }),
  );
}

function getRequiredLandmarks(pose: PoseResult, side: HandSide): { wrist?: Landmark; shoulder?: Landmark } {
  return {
    wrist: getLandmarkByName(pose.landmarks, `${side}Wrist`),
    shoulder: getLandmarkByName(pose.landmarks, `${side}Shoulder`),
  };
}

function evaluateHandUp(
  pose: PoseResult,
  landmarks: Landmark[],
  wristShoulderPairs: Array<[Landmark, Landmark]>,
): HandUpEvaluation {
  const torsoWidth = getTorsoWidth(pose);

  if (typeof torsoWidth === "number" && torsoWidth < MIN_FRONT_FACING_TORSO_WIDTH) {
    return { inactiveReason: "not-front-facing", torsoWidth };
  }

  if (!landmarks.every((landmark) => isLandmarkVisible(landmark, MIN_VISIBILITY))) {
    return { inactiveReason: "low-visibility", torsoWidth };
  }

  if (!wristShoulderPairs.every(([wrist, shoulder]) => isWristClearlyAboveShoulder(wrist, shoulder))) {
    return { inactiveReason: "not-high-enough", torsoWidth };
  }

  return { torsoWidth };
}

function isWristClearlyAboveShoulder(wrist: Landmark, shoulder: Landmark): boolean {
  return wrist.y < shoulder.y - HAND_UP_Y_MARGIN;
}

function getTorsoWidth(pose: PoseResult): number | undefined {
  const shoulderWidth = getHorizontalWidth(pose, "leftShoulder", "rightShoulder");
  const hipWidth = getHorizontalWidth(pose, "leftHip", "rightHip");
  const availableWidths = [shoulderWidth, hipWidth].filter((width): width is number => typeof width === "number");

  if (availableWidths.length === 0) {
    return undefined;
  }

  return Math.max(...availableWidths);
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

function createHandUpMetadata(options: HandUpMetadataOptions): Record<string, unknown> {
  return {
    reason: options.reason,
    torsoWidth: options.torsoWidth,
    wristY: options.wristY,
    shoulderY: options.shoulderY,
    yMargin: HAND_UP_Y_MARGIN,
    requiredVisibility: getRequiredVisibility(options.requiredLandmarks),
  };
}

function getRequiredVisibility(requiredLandmarks: Record<string, Landmark | undefined>): Record<string, number | undefined> {
  return Object.fromEntries(
    Object.entries(requiredLandmarks).map(([name, landmark]) => [name, landmark?.visibility]),
  ) as Record<string, number | undefined>;
}
