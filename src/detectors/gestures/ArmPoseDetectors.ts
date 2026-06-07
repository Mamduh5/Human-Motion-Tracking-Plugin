import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, calculateAngle, distance2D, isLandmarkVisible } from "../../utils";
import { resolveGestureThresholds, type GestureThresholds } from "./GestureThresholds";

const DEFAULT_THRESHOLDS = resolveGestureThresholds();

type ArmSide = "left" | "right";
type HandLandmarkKind = "wrist" | "index" | "pinky" | "thumb";
type ArmGestureReason =
  | "active"
  | "missing-landmarks"
  | "low-visibility"
  | "not-high-enough"
  | "not-extended"
  | "not-bent"
  | "not-crossed"
  | "not-on-hips";

interface ArmSideLandmarks {
  side: ArmSide;
  shoulder?: Landmark;
  elbow?: Landmark;
  wrist?: Landmark;
  index?: Landmark;
  pinky?: Landmark;
  thumb?: Landmark;
  hip?: Landmark;
}

interface HandPoint {
  landmark: Landmark;
  name: string;
}

interface SideEvaluation {
  side: ArmSide;
  active: boolean;
  reason: ArmGestureReason;
  confidence: number;
  elbowAngle?: number;
  handTopY?: number;
  handTopLandmarkName?: string;
  yDelta?: number;
  visibleHandLandmarks: string[];
  requiredVisibility: Record<string, number | undefined>;
}

type SideEvaluator = (landmarks: ArmSideLandmarks, bodyMetrics: BodyMetrics, thresholds: GestureThresholds) => SideEvaluation;

interface BodyMetrics {
  shoulderWidth?: number;
  torsoHeight?: number;
  scale: number;
}

export function detectArmsUp(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  const left = evaluateArmUp(getArmSideLandmarks(pose, "left"), getBodyMetrics(pose), thresholds);
  const right = evaluateArmUp(getArmSideLandmarks(pose, "right"), getBodyMetrics(pose), thresholds);
  const active = left.active && right.active;

  return createGestureResult("armsUp", pose.timestamp, active, averageSideConfidence([left, right]), {
    reason: active ? "active" : combineSideReasons([left, right]),
    sideResults: createSideResults({ left, right }),
  });
}

export function detectLeftArmExtended(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  return detectSingleSideGesture("leftArmExtended", pose, "left", evaluateArmExtended, thresholds);
}

export function detectRightArmExtended(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  return detectSingleSideGesture("rightArmExtended", pose, "right", evaluateArmExtended, thresholds);
}

export function detectLeftElbowBent(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  return detectSingleSideGesture("leftElbowBent", pose, "left", evaluateElbowBent, thresholds);
}

export function detectRightElbowBent(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  return detectSingleSideGesture("rightElbowBent", pose, "right", evaluateElbowBent, thresholds);
}

export function detectArmsCrossed(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  const left = getArmSideLandmarks(pose, "left");
  const right = getArmSideLandmarks(pose, "right");
  const required = {
    leftShoulder: left.shoulder,
    rightShoulder: right.shoulder,
    leftWrist: left.wrist,
    leftIndex: left.index,
    leftPinky: left.pinky,
    leftThumb: left.thumb,
    rightWrist: right.wrist,
    rightIndex: right.index,
    rightPinky: right.pinky,
    rightThumb: right.thumb,
  };
  const leftHand = getBestVisibleHandPoint(left, thresholds);
  const rightHand = getBestVisibleHandPoint(right, thresholds);

  if (!left.shoulder || !right.shoulder || !hasAnyHandLandmark(left) || !hasAnyHandLandmark(right)) {
    return createGestureResult("armsCrossed", pose.timestamp, false, 0, {
      reason: "missing-landmarks",
      requiredVisibility: getRequiredVisibility(required),
    });
  }

  const visibleShoulders = areVisible(thresholds, left.shoulder, right.shoulder);

  if (!visibleShoulders || !leftHand || !rightHand) {
    return createGestureResult("armsCrossed", pose.timestamp, false, averageConfidence([left.shoulder, right.shoulder]), {
      reason: "low-visibility",
      requiredVisibility: getRequiredVisibility(required),
    });
  }

  const shoulderWidth = distance2D(left.shoulder, right.shoulder);
  const leftCrossed = leftHand.landmark.x > right.shoulder.x - shoulderWidth * thresholds.crossedArmsDistance;
  const rightCrossed = rightHand.landmark.x < left.shoulder.x + shoulderWidth * thresholds.crossedArmsDistance;
  const active = leftCrossed && rightCrossed;

  return createGestureResult("armsCrossed", pose.timestamp, active, averageConfidence([left.shoulder, right.shoulder, leftHand.landmark, rightHand.landmark]), {
    reason: active ? "active" : "not-crossed",
    shoulderWidth,
    leftHandLandmarkName: leftHand.name,
    rightHandLandmarkName: rightHand.name,
    requiredVisibility: getRequiredVisibility(required),
  });
}

export function detectHandsOnHips(pose: PoseResult, thresholds = DEFAULT_THRESHOLDS): GestureResult {
  const bodyMetrics = getBodyMetrics(pose);
  const left = evaluateHandOnHip(getArmSideLandmarks(pose, "left"), bodyMetrics, thresholds);
  const right = evaluateHandOnHip(getArmSideLandmarks(pose, "right"), bodyMetrics, thresholds);
  const active = left.active && right.active;

  return createGestureResult("handsOnHips", pose.timestamp, active, averageSideConfidence([left, right]), {
    reason: active ? "active" : combineSideReasons([left, right]),
    sideResults: createSideResults({ left, right }),
  });
}

function detectSingleSideGesture(
  name: string,
  pose: PoseResult,
  side: ArmSide,
  evaluator: SideEvaluator,
  thresholds: GestureThresholds,
): GestureResult {
  const result = evaluator(getArmSideLandmarks(pose, side), getBodyMetrics(pose), thresholds);

  return createGestureResult(name, pose.timestamp, result.active, result.confidence, {
    reason: result.reason,
    side,
    angles: result.elbowAngle === undefined ? undefined : { elbow: result.elbowAngle },
    handTopY: result.handTopY,
    handTopLandmarkName: result.handTopLandmarkName,
    yDelta: result.yDelta,
    visibleHandLandmarks: result.visibleHandLandmarks,
    requiredVisibility: result.requiredVisibility,
  });
}

function evaluateArmUp(landmarks: ArmSideLandmarks, _bodyMetrics: BodyMetrics, thresholds: GestureThresholds): SideEvaluation {
  const required = getSideRequiredLandmarks(landmarks, ["shoulder"]);

  if (!landmarks.shoulder || !hasAnyHandLandmark(landmarks)) {
    return createSideEvaluation(landmarks, "missing-landmarks", false, required, thresholds);
  }

  if (!isLandmarkVisible(landmarks.shoulder, thresholds.minVisibility)) {
    return createSideEvaluation(landmarks, "low-visibility", false, required, thresholds);
  }

  const handTop = getHighestVisibleHandPoint(landmarks, thresholds);

  if (!handTop) {
    return createSideEvaluation(landmarks, "low-visibility", false, required, thresholds);
  }

  const yDelta = landmarks.shoulder.y - handTop.landmark.y;
  const active = handTop.landmark.y < landmarks.shoulder.y - thresholds.handUpYMargin;

  return createSideEvaluation(landmarks, active ? "active" : "not-high-enough", active, required, thresholds, {
    handTop,
    yDelta,
  });
}

function evaluateArmExtended(landmarks: ArmSideLandmarks, bodyMetrics: BodyMetrics, thresholds: GestureThresholds): SideEvaluation {
  const required = getSideRequiredLandmarks(landmarks, ["shoulder", "elbow"]);

  if (!landmarks.shoulder || !landmarks.elbow || !hasAnyHandLandmark(landmarks)) {
    return createSideEvaluation(landmarks, "missing-landmarks", false, required, thresholds);
  }

  const hand = getBestVisibleHandPoint(landmarks, thresholds);

  if (!areVisible(thresholds, landmarks.shoulder, landmarks.elbow) || !hand) {
    return createSideEvaluation(landmarks, "low-visibility", false, required, thresholds);
  }

  const elbowAngle = calculateAngle(landmarks.shoulder, landmarks.elbow, hand.landmark);
  const horizontalDirectionActive =
    landmarks.side === "left" ? hand.landmark.x < landmarks.shoulder.x : hand.landmark.x > landmarks.shoulder.x;
  const level = Math.abs(hand.landmark.y - landmarks.shoulder.y) <= bodyMetrics.scale * thresholds.armsOpenYOffset;
  const active = elbowAngle >= thresholds.armExtensionAngle - thresholds.armAngleTolerance && horizontalDirectionActive && level;

  return createSideEvaluation(landmarks, active ? "active" : "not-extended", active, required, thresholds, {
    handTop: hand,
    elbowAngle,
  });
}

function evaluateElbowBent(landmarks: ArmSideLandmarks, _bodyMetrics: BodyMetrics, thresholds: GestureThresholds): SideEvaluation {
  const required = getSideRequiredLandmarks(landmarks, ["shoulder", "elbow"]);

  if (!landmarks.shoulder || !landmarks.elbow || !hasAnyHandLandmark(landmarks)) {
    return createSideEvaluation(landmarks, "missing-landmarks", false, required, thresholds);
  }

  const hand = getBestVisibleHandPoint(landmarks, thresholds);

  if (!areVisible(thresholds, landmarks.shoulder, landmarks.elbow) || !hand) {
    return createSideEvaluation(landmarks, "low-visibility", false, required, thresholds);
  }

  const elbowAngle = calculateAngle(landmarks.shoulder, landmarks.elbow, hand.landmark);
  const active = elbowAngle <= thresholds.elbowBentAngle + thresholds.armAngleTolerance;

  return createSideEvaluation(landmarks, active ? "active" : "not-bent", active, required, thresholds, {
    handTop: hand,
    elbowAngle,
  });
}

function evaluateHandOnHip(landmarks: ArmSideLandmarks, bodyMetrics: BodyMetrics, thresholds: GestureThresholds): SideEvaluation {
  const required = getSideRequiredLandmarks(landmarks, ["shoulder", "hip"]);

  if (!landmarks.shoulder || !landmarks.hip || !hasAnyHandLandmark(landmarks)) {
    return createSideEvaluation(landmarks, "missing-landmarks", false, required, thresholds);
  }

  const hand = getBestVisibleHandPoint(landmarks, thresholds);

  if (!areVisible(thresholds, landmarks.shoulder, landmarks.hip) || !hand) {
    return createSideEvaluation(landmarks, "low-visibility", false, required, thresholds);
  }

  const handHipDistance = distance2D(hand.landmark, landmarks.hip);
  const active = handHipDistance <= bodyMetrics.scale * thresholds.handsOnHipsDistance;

  return createSideEvaluation(landmarks, active ? "active" : "not-on-hips", active, required, thresholds, {
    handTop: hand,
    handHipDistance,
  });
}

function createSideEvaluation(
  landmarks: ArmSideLandmarks,
  reason: ArmGestureReason,
  active: boolean,
  required: Record<string, Landmark | undefined>,
  thresholds: GestureThresholds,
  details: {
    handTop?: HandPoint;
    yDelta?: number;
    elbowAngle?: number;
    handHipDistance?: number;
  } = {},
): SideEvaluation {
  const handTop = details.handTop;
  const visibleHandLandmarks = getVisibleHandPoints(landmarks, thresholds).map((point) => point.name);
  const confidenceLandmarks = [
    landmarks.shoulder,
    landmarks.elbow,
    landmarks.hip,
    handTop?.landmark,
  ].filter((landmark): landmark is Landmark => Boolean(landmark && isLandmarkVisible(landmark, thresholds.minVisibility)));

  return {
    side: landmarks.side,
    active,
    reason,
    confidence: confidenceLandmarks.length > 0 ? averageConfidence(confidenceLandmarks) : 0,
    elbowAngle: details.elbowAngle,
    handTopY: handTop?.landmark.y,
    handTopLandmarkName: handTop?.name,
    yDelta: details.yDelta,
    visibleHandLandmarks,
    requiredVisibility: getRequiredVisibility(required),
  };
}

function getArmSideLandmarks(pose: PoseResult, side: ArmSide): ArmSideLandmarks {
  return {
    side,
    shoulder: getLandmarkByName(pose.landmarks, `${side}Shoulder`),
    elbow: getLandmarkByName(pose.landmarks, `${side}Elbow`),
    wrist: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "wrist")),
    index: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "index")),
    pinky: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "pinky")),
    thumb: getLandmarkByName(pose.landmarks, getHandLandmarkName(side, "thumb")),
    hip: getLandmarkByName(pose.landmarks, `${side}Hip`),
  };
}

function getBodyMetrics(pose: PoseResult): BodyMetrics {
  const leftShoulder = getLandmarkByName(pose.landmarks, "leftShoulder");
  const rightShoulder = getLandmarkByName(pose.landmarks, "rightShoulder");
  const leftHip = getLandmarkByName(pose.landmarks, "leftHip");
  const rightHip = getLandmarkByName(pose.landmarks, "rightHip");
  const shoulderWidth = leftShoulder && rightShoulder ? distance2D(leftShoulder, rightShoulder) : undefined;
  const torsoHeight = leftShoulder && leftHip ? distance2D(leftShoulder, leftHip) : undefined;

  return {
    shoulderWidth,
    torsoHeight,
    scale: Math.max(shoulderWidth ?? 0, torsoHeight ?? 0, 0.2),
  };
}

function hasAnyHandLandmark(landmarks: ArmSideLandmarks): boolean {
  return Boolean(landmarks.wrist || landmarks.index || landmarks.pinky || landmarks.thumb);
}

function getHighestVisibleHandPoint(landmarks: ArmSideLandmarks, thresholds: GestureThresholds): HandPoint | undefined {
  const points = getVisibleHandPoints(landmarks, thresholds);

  return points.reduce<HandPoint | undefined>((highest, current) => {
    if (!highest || current.landmark.y < highest.landmark.y) {
      return current;
    }

    return highest;
  }, undefined);
}

function getBestVisibleHandPoint(landmarks: ArmSideLandmarks, thresholds: GestureThresholds): HandPoint | undefined {
  return getVisibleHandPoints(landmarks, thresholds)[0];
}

function getVisibleHandPoints(landmarks: ArmSideLandmarks, thresholds: GestureThresholds): HandPoint[] {
  return (["wrist", "index", "pinky", "thumb"] as const)
    .map((kind) => {
      const landmark = landmarks[kind];

      return landmark && isLandmarkVisible(landmark, thresholds.minVisibility)
        ? {
            landmark,
            name: getHandLandmarkName(landmarks.side, kind),
          }
        : undefined;
    })
    .filter((point): point is HandPoint => Boolean(point));
}

function getSideRequiredLandmarks(
  landmarks: ArmSideLandmarks,
  extraRequired: Array<"shoulder" | "elbow" | "hip">,
): Record<string, Landmark | undefined> {
  const required: Record<string, Landmark | undefined> = {};

  for (const key of extraRequired) {
    required[`${landmarks.side}${capitalize(key)}`] = landmarks[key];
  }

  required[getHandLandmarkName(landmarks.side, "wrist")] = landmarks.wrist;
  required[getHandLandmarkName(landmarks.side, "index")] = landmarks.index;
  required[getHandLandmarkName(landmarks.side, "pinky")] = landmarks.pinky;
  required[getHandLandmarkName(landmarks.side, "thumb")] = landmarks.thumb;

  return required;
}

function getHandLandmarkName(side: ArmSide, kind: HandLandmarkKind): string {
  return `${side}${capitalize(kind)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function areVisible(thresholds: GestureThresholds, ...landmarks: Landmark[]): boolean {
  return landmarks.every((landmark) => isLandmarkVisible(landmark, thresholds.minVisibility));
}

function averageSideConfidence(results: SideEvaluation[]): number {
  const confidences = results.map((result) => result.confidence).filter((confidence) => confidence > 0);

  return confidences.length > 0 ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length : 0;
}

function combineSideReasons(results: SideEvaluation[]): ArmGestureReason {
  if (results.every((result) => result.reason === "missing-landmarks")) {
    return "missing-landmarks";
  }

  if (results.some((result) => result.reason === "low-visibility")) {
    return "low-visibility";
  }

  if (results.some((result) => result.reason === "missing-landmarks")) {
    return "missing-landmarks";
  }

  return results.find((result) => result.reason !== "active")?.reason ?? "active";
}

function createSideResults(results: Partial<Record<ArmSide, SideEvaluation>>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(results).map(([side, result]) => [
      side,
      result
        ? {
            side: result.side,
            active: result.active,
            reason: result.reason,
            confidence: result.confidence,
            angles: result.elbowAngle === undefined ? undefined : { elbow: result.elbowAngle },
            handTopY: result.handTopY,
            handTopLandmarkName: result.handTopLandmarkName,
            yDelta: result.yDelta,
            visibleHandLandmarks: result.visibleHandLandmarks,
            requiredVisibility: result.requiredVisibility,
          }
        : undefined,
    ]),
  );
}

function getRequiredVisibility(requiredLandmarks: Record<string, Landmark | undefined>): Record<string, number | undefined> {
  return Object.fromEntries(
    Object.entries(requiredLandmarks).map(([name, landmark]) => [name, landmark?.visibility]),
  ) as Record<string, number | undefined>;
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
