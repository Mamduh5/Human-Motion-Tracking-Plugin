import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, distance2D, isLandmarkVisible } from "../../utils";
import { resolveGestureThresholds, type GestureThresholds } from "./GestureThresholds";

const DEFAULT_THRESHOLDS = resolveGestureThresholds();

type HandSide = "left" | "right";
type HandLandmarkKind = "wrist" | "index" | "pinky" | "thumb";
type InactiveReason = "missing-landmarks" | "low-visibility" | "not-front-facing" | "not-high-enough";
type HandUpReason = InactiveReason | "active";
type BodyOrientation = "front" | "side" | "unknown";

interface HandUpMetadataOptions {
  reason: HandUpReason;
  orientation?: BodyOrientation;
  side?: HandSide;
  sideResult?: HandSideEvaluation;
  sideResults?: Partial<Record<HandSide, HandSideEvaluation>>;
  thresholds: GestureThresholds;
  shoulderWidth?: number;
  hipWidth?: number;
  torsoWidth?: number;
  torsoHeight?: number;
  frontFacingScore?: number;
  frontFacingThreshold?: number;
}

interface BodyOrientationEvaluation {
  inactiveReason?: InactiveReason;
  orientation: BodyOrientation;
  shoulderWidth?: number;
  hipWidth?: number;
  torsoWidth?: number;
  torsoHeight?: number;
  frontFacingScore?: number;
  frontFacingThreshold?: number;
}

interface HandSideLandmarks {
  side: HandSide;
  wrist?: Landmark;
  index?: Landmark;
  pinky?: Landmark;
  thumb?: Landmark;
  shoulder?: Landmark;
}

interface HandSideEvaluation {
  side: HandSide;
  active: boolean;
  reason: HandUpReason;
  confidence: number;
  landmarks: HandSideLandmarks;
  visibleHandLandmarks: string[];
  handTopY?: number;
  handTopLandmarkName?: string;
  shoulderY?: number;
  yDelta?: number;
}

interface TorsoLandmarks {
  leftShoulder?: Landmark;
  rightShoulder?: Landmark;
  leftHip?: Landmark;
  rightHip?: Landmark;
}

export function detectRightHandUp(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  return detectAnatomicalHandUp(pose, "right", thresholds);
}

export function detectHandUp(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  const left = evaluateHandSideUp(pose, "left", thresholds);
  const right = evaluateHandSideUp(pose, "right", thresholds);
  const activeSideCandidates = [left, right].filter((result) => result.active).map((result) => result.side);
  const active = activeSideCandidates.length > 0;
  const reason: HandUpReason = active ? "active" : getCombinedInactiveReason([left, right]);
  const confidence = active
    ? Math.max(...[left, right].filter((result) => result.active).map((result) => result.confidence))
    : averageSideConfidence([left, right]);

  return createGestureResult(
    "handUp",
    pose.timestamp,
    active,
    confidence,
    createHandUpMetadata({
      reason,
      sideResults: { left, right },
      thresholds,
    }),
  );
}

export function detectBothHandsUp(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  const left = evaluateHandSideUp(pose, "left", thresholds);
  const right = evaluateHandSideUp(pose, "right", thresholds);
  const orientationEvaluation = evaluateBodyOrientation(pose, thresholds);
  const blockedByOrientation = orientationEvaluation.orientation === "side" && orientationEvaluation.inactiveReason === "not-front-facing";
  const active = !blockedByOrientation && left.active && right.active;
  const reason: HandUpReason = blockedByOrientation
    ? "not-front-facing"
    : active
      ? "active"
      : getCombinedInactiveReason([left, right]);
  const confidence = averageSideConfidence([left, right]);

  return createGestureResult(
    "bothHandsUp",
    pose.timestamp,
    active,
    confidence,
    createHandUpMetadata({
      reason,
      orientation: orientationEvaluation.orientation,
      sideResults: { left, right },
      shoulderWidth: orientationEvaluation.shoulderWidth,
      hipWidth: orientationEvaluation.hipWidth,
      torsoWidth: orientationEvaluation.torsoWidth,
      torsoHeight: orientationEvaluation.torsoHeight,
      frontFacingScore: orientationEvaluation.frontFacingScore,
      frontFacingThreshold: orientationEvaluation.frontFacingThreshold,
      thresholds,
    }),
  );
}

export function detectLeftHandUp(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  return detectAnatomicalHandUp(pose, "left", thresholds);
}

function detectAnatomicalHandUp(pose: PoseResult, side: HandSide, thresholds: GestureThresholds): GestureResult {
  const name = side === "left" ? "leftHandUp" : "rightHandUp";
  const sideResult = evaluateHandSideUp(pose, side, thresholds);
  const orientationEvaluation = evaluateBodyOrientation(pose, thresholds);
  const blockedByOrientation = orientationEvaluation.orientation === "side" && orientationEvaluation.inactiveReason === "not-front-facing";
  const active = !blockedByOrientation && sideResult.active;
  const reason: HandUpReason = blockedByOrientation ? "not-front-facing" : sideResult.reason;

  return createGestureResult(
    name,
    pose.timestamp,
    active,
    sideResult.confidence,
    createHandUpMetadata({
      reason,
      orientation: orientationEvaluation.orientation,
      side,
      sideResult,
      shoulderWidth: orientationEvaluation.shoulderWidth,
      hipWidth: orientationEvaluation.hipWidth,
      torsoWidth: orientationEvaluation.torsoWidth,
      torsoHeight: orientationEvaluation.torsoHeight,
      frontFacingScore: orientationEvaluation.frontFacingScore,
      frontFacingThreshold: orientationEvaluation.frontFacingThreshold,
      thresholds,
    }),
  );
}

function evaluateHandSideUp(pose: PoseResult, side: HandSide, thresholds: GestureThresholds): HandSideEvaluation {
  const landmarks = getHandSideLandmarks(pose, side);
  const handLandmarks = getHandLandmarkEntries(landmarks);
  const visibleHandLandmarks = handLandmarks.filter(([, landmark]) => isLandmarkVisible(landmark, thresholds.minVisibility));

  if (!landmarks.shoulder) {
    return createHandSideEvaluation(landmarks, "missing-landmarks", false, visibleHandLandmarks);
  }

  if (!isLandmarkVisible(landmarks.shoulder, thresholds.minVisibility)) {
    return createHandSideEvaluation(landmarks, "low-visibility", false, visibleHandLandmarks);
  }

  if (handLandmarks.length === 0) {
    return createHandSideEvaluation(landmarks, "missing-landmarks", false, visibleHandLandmarks);
  }

  if (visibleHandLandmarks.length === 0) {
    return createHandSideEvaluation(landmarks, "low-visibility", false, visibleHandLandmarks);
  }

  const [handTopKind, handTopLandmark] = visibleHandLandmarks.reduce((highest, current) => {
    return current[1].y < highest[1].y ? current : highest;
  });
  const handTopY = handTopLandmark.y;
  const shoulderY = landmarks.shoulder.y;
  const yDelta = shoulderY - handTopY;
  const active = handTopY < shoulderY - thresholds.handUpYMargin;

  return {
    side,
    active,
    reason: active ? "active" : "not-high-enough",
    confidence: averageConfidence([landmarks.shoulder, ...visibleHandLandmarks.map(([, landmark]) => landmark)]),
    landmarks,
    visibleHandLandmarks: visibleHandLandmarks.map(([kind]) => getHandLandmarkName(side, kind)),
    handTopY,
    handTopLandmarkName: getHandLandmarkName(side, handTopKind),
    shoulderY,
    yDelta,
  };
}

function createHandSideEvaluation(
  landmarks: HandSideLandmarks,
  reason: InactiveReason,
  active: boolean,
  visibleHandLandmarks: Array<[HandLandmarkKind, Landmark]>,
): HandSideEvaluation {
  return {
    side: landmarks.side,
    active,
    reason,
    confidence: 0,
    landmarks,
    visibleHandLandmarks: visibleHandLandmarks.map(([kind]) => getHandLandmarkName(landmarks.side, kind)),
    shoulderY: landmarks.shoulder?.y,
  };
}

function getHandSideLandmarks(pose: PoseResult, side: HandSide): HandSideLandmarks {
  return {
    side,
    wrist: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "wrist")),
    index: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "index")),
    pinky: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "pinky")),
    thumb: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "thumb")),
    shoulder: getLandmarkByName(pose.landmarks, `${side}Shoulder`),
  };
}

function getHandLandmarkEntries(landmarks: HandSideLandmarks): Array<[HandLandmarkKind, Landmark]> {
  return (["wrist", "index", "pinky", "thumb"] as const)
    .map((kind) => [kind, landmarks[kind]] as const)
    .filter((entry): entry is [HandLandmarkKind, Landmark] => Boolean(entry[1]));
}

function getHandLandmarkName(side: HandSide, kind: HandLandmarkKind): string {
  const suffix = kind.charAt(0).toUpperCase() + kind.slice(1);

  return `${side}${suffix}`;
}

function getCombinedInactiveReason(results: HandSideEvaluation[]): InactiveReason {
  if (results.every((result) => result.reason === "missing-landmarks")) {
    return "missing-landmarks";
  }

  if (results.some((result) => result.reason === "low-visibility")) {
    return "low-visibility";
  }

  if (results.some((result) => result.reason === "missing-landmarks")) {
    return "missing-landmarks";
  }

  return "not-high-enough";
}

function averageSideConfidence(results: HandSideEvaluation[]): number {
  const confidences = results.map((result) => result.confidence).filter((confidence) => confidence > 0);

  return confidences.length > 0 ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length : 0;
}

function evaluateBodyOrientation(pose: PoseResult, thresholds: GestureThresholds): BodyOrientationEvaluation {
  const torso = getTorsoLandmarks(pose);

  if (!torso.leftShoulder || !torso.rightShoulder) {
    return { orientation: "unknown", frontFacingThreshold: thresholds.frontFacingScore };
  }

  const shoulderWidth = Math.abs(torso.leftShoulder.x - torso.rightShoulder.x);

  if (
    !isLandmarkVisible(torso.leftShoulder, thresholds.minVisibility) ||
    !isLandmarkVisible(torso.rightShoulder, thresholds.minVisibility) ||
    !torso.leftHip ||
    !torso.rightHip ||
    !isLandmarkVisible(torso.leftHip, thresholds.minVisibility) ||
    !isLandmarkVisible(torso.rightHip, thresholds.minVisibility)
  ) {
    return {
      orientation: "unknown",
      shoulderWidth,
      frontFacingThreshold: thresholds.frontFacingScore,
    };
  }

  const hipWidth = Math.abs(torso.leftHip.x - torso.rightHip.x);
  const torsoWidth = Math.max(shoulderWidth, hipWidth);
  const shoulderCenter = getMidpoint(torso.leftShoulder, torso.rightShoulder);
  const hipCenter = getMidpoint(torso.leftHip, torso.rightHip);
  const torsoHeight = distance2D(shoulderCenter, hipCenter);
  const frontFacingScore = torsoHeight > 0 ? torsoWidth / torsoHeight : 0;

  if (frontFacingScore < thresholds.frontFacingScore) {
    return {
      orientation: "side",
      inactiveReason: "not-front-facing",
      shoulderWidth,
      hipWidth,
      torsoWidth,
      torsoHeight,
      frontFacingScore,
      frontFacingThreshold: thresholds.frontFacingScore,
    };
  }

  return {
    orientation: "front",
    shoulderWidth,
    hipWidth,
    torsoWidth,
    torsoHeight,
    frontFacingScore,
    frontFacingThreshold: thresholds.frontFacingScore,
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
  const sideResult = options.sideResult;
  const sideResults = options.sideResults ? serializeSideResults(options.sideResults, options.thresholds) : undefined;

  return {
    reason: options.reason,
    orientation: options.orientation,
    side: options.side,
    shoulderWidth: options.shoulderWidth,
    hipWidth: options.hipWidth,
    torsoWidth: options.torsoWidth,
    torsoHeight: options.torsoHeight,
    frontFacingScore: options.frontFacingScore,
    frontFacingThreshold: options.frontFacingThreshold,
    handTopY: sideResult?.handTopY,
    handTopLandmarkName: sideResult?.handTopLandmarkName,
    shoulderY: sideResult?.shoulderY,
    yDelta: sideResult?.yDelta,
    yMargin: options.thresholds.handUpYMargin,
    visibleHandLandmarks: sideResult?.visibleHandLandmarks,
    wristY: sideResult?.landmarks.wrist?.y,
    requiredVisibility: sideResult ? getRequiredVisibility(getRequiredLandmarks(sideResult.landmarks)) : getMergedRequiredVisibility(options.sideResults),
    sideResults,
    activeSideCandidates: options.sideResults
      ? Object.values(options.sideResults)
          .filter((result): result is HandSideEvaluation => Boolean(result?.active))
          .map((result) => result.side)
      : undefined,
    leftVisible: options.sideResults?.left ? isSideVisible(options.sideResults.left, options.thresholds) : undefined,
    rightVisible: options.sideResults?.right ? isSideVisible(options.sideResults.right, options.thresholds) : undefined,
    leftWristY: options.sideResults?.left?.landmarks.wrist?.y,
    leftShoulderY: options.sideResults?.left?.shoulderY,
    rightWristY: options.sideResults?.right?.landmarks.wrist?.y,
    rightShoulderY: options.sideResults?.right?.shoulderY,
  };
}

function serializeSideResults(
  sideResults: Partial<Record<HandSide, HandSideEvaluation>>,
  thresholds: GestureThresholds,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(sideResults).map(([side, result]) => {
      return [
        side,
        result
          ? {
              side: result.side,
              active: result.active,
              reason: result.reason,
              confidence: result.confidence,
              handTopY: result.handTopY,
              handTopLandmarkName: result.handTopLandmarkName,
              shoulderY: result.shoulderY,
              yDelta: result.yDelta,
              yMargin: thresholds.handUpYMargin,
              visibleHandLandmarks: result.visibleHandLandmarks,
              requiredVisibility: getRequiredVisibility(getRequiredLandmarks(result.landmarks)),
            }
          : undefined,
      ];
    }),
  );
}

function getRequiredLandmarks(landmarks: HandSideLandmarks): Record<string, Landmark | undefined> {
  return {
    [getHandLandmarkName(landmarks.side, "wrist")]: landmarks.wrist,
    [getHandLandmarkName(landmarks.side, "index")]: landmarks.index,
    [getHandLandmarkName(landmarks.side, "pinky")]: landmarks.pinky,
    [getHandLandmarkName(landmarks.side, "thumb")]: landmarks.thumb,
    [`${landmarks.side}Shoulder`]: landmarks.shoulder,
  };
}

function getMergedRequiredVisibility(sideResults?: Partial<Record<HandSide, HandSideEvaluation>>): Record<string, number | undefined> | undefined {
  if (!sideResults) {
    return undefined;
  }

  return Object.assign(
    {},
    ...Object.values(sideResults)
      .filter((result): result is HandSideEvaluation => Boolean(result))
      .map((result) => getRequiredVisibility(getRequiredLandmarks(result.landmarks))),
  ) as Record<string, number | undefined>;
}

function isSideVisible(result: HandSideEvaluation, thresholds: GestureThresholds): boolean {
  return Boolean(result.landmarks.shoulder && isLandmarkVisible(result.landmarks.shoulder, thresholds.minVisibility)) && result.visibleHandLandmarks.length > 0;
}

function getRequiredVisibility(requiredLandmarks: Record<string, Landmark | undefined>): Record<string, number | undefined> {
  return Object.fromEntries(
    Object.entries(requiredLandmarks).map(([name, landmark]) => [name, landmark?.visibility]),
  ) as Record<string, number | undefined>;
}
