import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, distance2D, isLandmarkVisible } from "../../utils";

const MIN_VISIBILITY = 0.5;
const HAND_UP_Y_MARGIN = 0.03;
const MIN_FRONT_FACING_SCORE = 0.35;

type HandSide = "left" | "right";
type InactiveReason = "missing-landmarks" | "low-visibility" | "not-front-facing" | "not-high-enough";
type HandUpReason = InactiveReason | "active";
type HandUpYMetadata = number | Partial<Record<HandSide, number>>;
type BodyOrientation = "front" | "side" | "unknown";

interface HandUpMetadataOptions {
  reason: HandUpReason;
  requiredLandmarks: Record<string, Landmark | undefined>;
  wristY?: HandUpYMetadata;
  shoulderY?: HandUpYMetadata;
  orientation?: BodyOrientation;
  shoulderWidth?: number;
  hipWidth?: number;
  torsoWidth?: number;
  torsoHeight?: number;
  frontFacingScore?: number;
  frontFacingThreshold?: number;
}

interface HandUpEvaluation {
  inactiveReason?: InactiveReason;
  orientation: BodyOrientation;
  shoulderWidth?: number;
  hipWidth?: number;
  torsoWidth?: number;
  torsoHeight?: number;
  frontFacingScore?: number;
  frontFacingThreshold?: number;
}

interface TorsoLandmarks {
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftHip?: Landmark;
  rightHip?: Landmark;
}

export function detectLeftHandUp(pose: PoseResult): GestureResult {
  return detectAnatomicalHandUp(pose, "left");
}

export function detectRightHandUp(pose: PoseResult): GestureResult {
  return detectAnatomicalHandUp(pose, "right");
}

export function detectHandUp(pose: PoseResult): GestureResult {
  const left = getRequiredLandmarks(pose, "left");
  const right = getRequiredLandmarks(pose, "right");
  const requiredLandmarks = {
    leftWrist: left.wrist,
    leftShoulder: left.shoulder,
    rightWrist: right.wrist,
    rightShoulder: right.shoulder,
  };
  const completeSides = [
    ["left", left] as const,
    ["right", right] as const,
  ].filter((side): side is readonly [HandSide, { wrist: Landmark; shoulder: Landmark }] => {
    return Boolean(side[1].wrist && side[1].shoulder);
  });

  if (completeSides.length === 0) {
    return createGestureResult(
      "handUp",
      pose.timestamp,
      false,
      0,
      createGenericHandUpMetadata({ reason: "missing-landmarks", requiredLandmarks, activeSideCandidates: [] }),
    );
  }

  const visibleSides = completeSides.filter(([, landmarks]) => {
    return isLandmarkVisible(landmarks.wrist, MIN_VISIBILITY) && isLandmarkVisible(landmarks.shoulder, MIN_VISIBILITY);
  });
  const activeSideCandidates = visibleSides
    .filter(([, landmarks]) => isWristClearlyAboveShoulder(landmarks.wrist, landmarks.shoulder))
    .map(([side]) => side);
  const active = activeSideCandidates.length > 0;
  const reason: HandUpReason = active ? "active" : visibleSides.length === 0 ? "low-visibility" : "not-high-enough";
  const confidence = averageConfidence(completeSides.flatMap(([, landmarks]) => [landmarks.wrist, landmarks.shoulder]));

  return createGestureResult(
    "handUp",
    pose.timestamp,
    active,
    confidence,
    createGenericHandUpMetadata({ reason, requiredLandmarks, activeSideCandidates }),
  );
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
      orientation: evaluation.orientation,
      shoulderWidth: evaluation.shoulderWidth,
      hipWidth: evaluation.hipWidth,
      torsoWidth: evaluation.torsoWidth,
      torsoHeight: evaluation.torsoHeight,
      frontFacingScore: evaluation.frontFacingScore,
      frontFacingThreshold: evaluation.frontFacingThreshold,
    }),
  );
}

function detectAnatomicalHandUp(pose: PoseResult, side: HandSide): GestureResult {
  const { wrist, shoulder } = getRequiredLandmarks(pose, side);
  const torso = getTorsoLandmarks(pose);
  const name = side === "left" ? "leftHandUp" : "rightHandUp";
  const requiredLandmarks = {
    [`${side}Wrist`]: wrist,
    [`${side}Shoulder`]: shoulder,
    leftShoulder: torso.leftShoulder,
    rightShoulder: torso.rightShoulder,
    leftHip: torso.leftHip,
    rightHip: torso.rightHip,
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
      orientation: evaluation.orientation,
      shoulderWidth: evaluation.shoulderWidth,
      hipWidth: evaluation.hipWidth,
      torsoWidth: evaluation.torsoWidth,
      torsoHeight: evaluation.torsoHeight,
      frontFacingScore: evaluation.frontFacingScore,
      frontFacingThreshold: evaluation.frontFacingThreshold,
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
  const orientationEvaluation = evaluateBodyOrientation(pose);

  if (orientationEvaluation.inactiveReason) {
    return orientationEvaluation;
  }

  if (!landmarks.every((landmark) => isLandmarkVisible(landmark, MIN_VISIBILITY))) {
    return { ...orientationEvaluation, inactiveReason: "low-visibility" };
  }

  if (!wristShoulderPairs.every(([wrist, shoulder]) => isWristClearlyAboveShoulder(wrist, shoulder))) {
    return { ...orientationEvaluation, inactiveReason: "not-high-enough" };
  }

  return orientationEvaluation;
}

function isWristClearlyAboveShoulder(wrist: Landmark, shoulder: Landmark): boolean {
  return wrist.y < shoulder.y - HAND_UP_Y_MARGIN;
}

function evaluateBodyOrientation(pose: PoseResult): HandUpEvaluation {
  const torso = getTorsoLandmarks(pose);

  if (!torso.leftShoulder || !torso.rightShoulder) {
    return { orientation: "unknown", frontFacingThreshold: MIN_FRONT_FACING_SCORE };
  }

  const shoulderWidth = Math.abs(torso.leftShoulder.x - torso.rightShoulder.x);

  if (
    !isLandmarkVisible(torso.leftShoulder, MIN_VISIBILITY) ||
    !isLandmarkVisible(torso.rightShoulder, MIN_VISIBILITY) ||
    !torso.leftHip ||
    !torso.rightHip ||
    !isLandmarkVisible(torso.leftHip, MIN_VISIBILITY) ||
    !isLandmarkVisible(torso.rightHip, MIN_VISIBILITY)
  ) {
    return {
      orientation: "unknown",
      shoulderWidth,
      frontFacingThreshold: MIN_FRONT_FACING_SCORE,
    };
  }

  const hipWidth = Math.abs(torso.leftHip.x - torso.rightHip.x);
  const torsoWidth = Math.max(shoulderWidth, hipWidth);
  const shoulderCenter = getMidpoint(torso.leftShoulder, torso.rightShoulder);
  const hipCenter = getMidpoint(torso.leftHip, torso.rightHip);
  const torsoHeight = distance2D(shoulderCenter, hipCenter);
  const frontFacingScore = torsoHeight > 0 ? torsoWidth / torsoHeight : 0;

  if (frontFacingScore < MIN_FRONT_FACING_SCORE) {
    return {
      orientation: "side",
      inactiveReason: "not-front-facing",
      shoulderWidth,
      hipWidth,
      torsoWidth,
      torsoHeight,
      frontFacingScore,
      frontFacingThreshold: MIN_FRONT_FACING_SCORE,
    };
  }

  return {
    orientation: "front",
    shoulderWidth,
    hipWidth,
    torsoWidth,
    torsoHeight,
    frontFacingScore,
    frontFacingThreshold: MIN_FRONT_FACING_SCORE,
  };
}

function getTorsoLandmarks(pose: PoseResult): TorsoLandmarks {
  return {
    leftShoulder: getLandmarkByName(pose.landmarks, "leftShoulder"),
    rightShoulder: getLandmarkByName(pose.landmarks, "rightShoulder"),
    leftHip: getLandmarkByName(pose.landmarks, "leftHip"),
    rightHip: getLandmarkByName(pose.landmarks, "rightHip"),
  };
}

function getMidpoint(firstLandmark: Landmark, secondLandmark: Landmark): { x: number; y: number } {
  return {
    x: (firstLandmark.x + secondLandmark.x) / 2,
    y: (firstLandmark.y + secondLandmark.y) / 2,
  };
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
    orientation: options.orientation,
    shoulderWidth: options.shoulderWidth,
    hipWidth: options.hipWidth,
    torsoWidth: options.torsoWidth,
    torsoHeight: options.torsoHeight,
    frontFacingScore: options.frontFacingScore,
    frontFacingThreshold: options.frontFacingThreshold,
    wristY: options.wristY,
    shoulderY: options.shoulderY,
    yMargin: HAND_UP_Y_MARGIN,
    requiredVisibility: getRequiredVisibility(options.requiredLandmarks),
  };
}

function createGenericHandUpMetadata(options: {
  reason: HandUpReason;
  requiredLandmarks: Record<string, Landmark | undefined>;
  activeSideCandidates: HandSide[];
}): Record<string, unknown> {
  const leftWrist = options.requiredLandmarks.leftWrist;
  const leftShoulder = options.requiredLandmarks.leftShoulder;
  const rightWrist = options.requiredLandmarks.rightWrist;
  const rightShoulder = options.requiredLandmarks.rightShoulder;

  return {
    reason: options.reason,
    activeSideCandidates: options.activeSideCandidates,
    leftVisible: areLandmarksVisible(leftWrist, leftShoulder),
    rightVisible: areLandmarksVisible(rightWrist, rightShoulder),
    leftWristY: leftWrist?.y,
    leftShoulderY: leftShoulder?.y,
    rightWristY: rightWrist?.y,
    rightShoulderY: rightShoulder?.y,
    yMargin: HAND_UP_Y_MARGIN,
    requiredVisibility: getRequiredVisibility(options.requiredLandmarks),
  };
}

function areLandmarksVisible(...landmarks: Array<Landmark | undefined>): boolean {
  return landmarks.every((landmark) => Boolean(landmark && isLandmarkVisible(landmark, MIN_VISIBILITY)));
}

function getRequiredVisibility(requiredLandmarks: Record<string, Landmark | undefined>): Record<string, number | undefined> {
  return Object.fromEntries(
    Object.entries(requiredLandmarks).map(([name, landmark]) => [name, landmark?.visibility]),
  ) as Record<string, number | undefined>;
}
