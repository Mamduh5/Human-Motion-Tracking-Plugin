import { describe, expect, it } from "vitest";

import {
  detectArmsOpen,
  detectBothHandsUp,
  detectHandUp,
  detectLeftHandUp,
  detectRightHandUp,
  detectStanding,
} from "../../src/detectors";
import type { Landmark, PoseResult } from "../../src/types";

describe("gesture detectors", () => {
  it("detects left hand up front-facing", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("leftWrist", 15, 0.3, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: true,
      confidence: 1,
      metadata: expect.objectContaining({
        reason: "active",
        orientation: "front",
        torsoWidth: expect.any(Number),
        torsoHeight: expect.any(Number),
        frontFacingScore: expect.any(Number),
        frontFacingThreshold: 0.35,
        wristY: 0.2,
        shoulderY: 0.4,
        yMargin: 0.03,
        requiredVisibility: expect.objectContaining({
          leftWrist: 1,
          leftShoulder: 1,
        }),
      }),
    });
  });

  it("detects right hand up front-facing", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectRightHandUp(pose)).toMatchObject({ name: "rightHandUp", active: true, confidence: 1 });
  });

  it("detects both hands up front-facing", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({ name: "leftHandUp", active: true, confidence: 1 });
    expect(detectRightHandUp(pose)).toMatchObject({ name: "rightHandUp", active: true, confidence: 1 });
    expect(detectBothHandsUp(pose)).toMatchObject({ name: "bothHandsUp", active: true, confidence: 1 });
  });

  it("detects close-up left hand up when hips are missing", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.6),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "unknown",
        shoulderWidth: expect.closeTo(0.4),
      },
    });
  });

  it("detects close-up right hand up when hips are missing", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.6),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "unknown",
        shoulderWidth: expect.closeTo(0.4),
      },
    });
  });

  it("detects close-up both hands up when hips are missing", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "unknown",
      },
    });
  });

  it("detects close-up generic hand up when hips are missing", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.6),
    ]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      metadata: {
        reason: "active",
        activeSideCandidates: ["left"],
      },
    });
  });

  it("does not report missing landmarks for anatomical gestures when only hips are missing", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectLeftHandUp(pose).metadata).toMatchObject({ reason: "active", orientation: "unknown" });
    expect(detectRightHandUp(pose).metadata).toMatchObject({ reason: "active", orientation: "unknown" });
    expect(detectBothHandsUp(pose).metadata).toMatchObject({ reason: "active", orientation: "unknown" });
  });

  it("detects left hand up when the wrist is not high enough but leftIndex is above the shoulder", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.39),
      landmark("leftIndex", 19, 0.3, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "unknown",
        side: "left",
        handTopY: 0.2,
        handTopLandmarkName: "leftIndex",
        shoulderY: 0.4,
        yDelta: expect.closeTo(0.2),
        yMargin: 0.03,
        visibleHandLandmarks: ["leftWrist", "leftIndex"],
      },
    });
  });

  it("detects right hand up when the wrist is not high enough but rightThumb is above the shoulder", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("rightWrist", 16, 0.7, 0.39),
      landmark("rightThumb", 22, 0.7, 0.2),
    ]);

    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "unknown",
        side: "right",
        handTopY: 0.2,
        handTopLandmarkName: "rightThumb",
        shoulderY: 0.4,
        yDelta: expect.closeTo(0.2),
        visibleHandLandmarks: ["rightWrist", "rightThumb"],
      },
    });
  });

  it("detects generic hand up when only one side has a visible raised hand point", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftIndex", 19, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2, 0.2),
    ]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      metadata: {
        reason: "active",
        activeSideCandidates: ["left"],
        sideResults: {
          left: expect.objectContaining({ active: true, handTopLandmarkName: "leftIndex" }),
          right: expect.objectContaining({ active: false, reason: "low-visibility" }),
        },
      },
    });
  });

  it("does not detect both hands up when only one side is active and exposes side reasons", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftIndex", 19, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.6),
    ]);

    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: {
        reason: "not-high-enough",
        sideResults: {
          left: expect.objectContaining({ active: true, reason: "active", handTopLandmarkName: "leftIndex" }),
          right: expect.objectContaining({ active: false, reason: "not-high-enough", handTopLandmarkName: "rightWrist" }),
        },
      },
    });
  });

  it("detects both hands up when both sides have any visible hand point above the shoulders", () => {
    const pose = createPose([
      ...closeUpShoulders(),
      landmark("leftWrist", 15, 0.3, 0.39),
      landmark("leftPinky", 17, 0.28, 0.2),
      landmark("rightWrist", 16, 0.7, 0.39),
      landmark("rightIndex", 20, 0.72, 0.2),
    ]);

    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "unknown",
        sideResults: {
          left: expect.objectContaining({ active: true, handTopLandmarkName: "leftPinky" }),
          right: expect.objectContaining({ active: true, handTopLandmarkName: "rightIndex" }),
        },
      },
    });
  });

  it("does not activate when hand points are low visibility", () => {
    const pose = createPose([...closeUpShoulders(), landmark("leftIndex", 19, 0.3, 0.2, 0.4)]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: {
        reason: "low-visibility",
        visibleHandLandmarks: [],
        requiredVisibility: expect.objectContaining({
          leftIndex: 0.4,
          leftShoulder: 1,
        }),
      },
    });
  });

  it("blocks anatomical hand-up gestures when side-facing but still allows generic handUp", () => {
    const pose = createPose([
      ...sideFacingTorso(),
      landmark("leftIndex", 19, 0.48, 0.2),
      landmark("rightThumb", 22, 0.52, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-front-facing", orientation: "side", handTopLandmarkName: "leftIndex" },
    });
    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: false,
      metadata: { reason: "not-front-facing", orientation: "side", handTopLandmarkName: "rightThumb" },
    });
    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "not-front-facing", orientation: "side" },
    });
    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      metadata: {
        reason: "active",
        activeSideCandidates: ["left", "right"],
      },
    });
  });

  it("detects left hand up for a smaller full-body front-facing pose", () => {
    const pose = createPose([...smallFrontFacingTorso(), landmark("leftWrist", 15, 0.455, 0.22)]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "front",
        torsoWidth: expect.closeTo(0.09),
        torsoHeight: expect.closeTo(0.2),
        frontFacingScore: expect.closeTo(0.45),
        frontFacingThreshold: 0.35,
      },
    });
  });

  it("detects right hand up for a smaller full-body front-facing pose", () => {
    const pose = createPose([...smallFrontFacingTorso(), landmark("rightWrist", 16, 0.545, 0.22)]);

    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "front",
        torsoWidth: expect.closeTo(0.09),
        torsoHeight: expect.closeTo(0.2),
        frontFacingScore: expect.closeTo(0.45),
        frontFacingThreshold: 0.35,
      },
    });
  });

  it("detects both hands up for a smaller full-body front-facing pose", () => {
    const pose = createPose([
      ...smallFrontFacingTorso(),
      landmark("leftWrist", 15, 0.455, 0.22),
      landmark("rightWrist", 16, 0.545, 0.22),
    ]);

    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: true,
      metadata: {
        reason: "active",
        orientation: "front",
        torsoWidth: expect.closeTo(0.09),
        torsoHeight: expect.closeTo(0.2),
        frontFacingScore: expect.closeTo(0.45),
        frontFacingThreshold: 0.35,
      },
    });
  });

  it("detects generic hand up for a front-facing left hand raise", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.6),
    ]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      confidence: 1,
      metadata: {
        reason: "active",
        activeSideCandidates: ["left"],
        leftVisible: true,
        rightVisible: true,
        leftWristY: 0.2,
        leftShoulderY: 0.4,
        rightWristY: 0.6,
        rightShoulderY: 0.4,
        yMargin: 0.03,
      },
    });
  });

  it("detects generic hand up for a front-facing right hand raise", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("leftWrist", 15, 0.3, 0.6),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      metadata: {
        reason: "active",
        activeSideCandidates: ["right"],
        leftVisible: true,
        rightVisible: true,
      },
    });
  });

  it("detects generic hand up for a side-facing one visible hand raise", () => {
    const pose = createPose([
      ...sideFacingTorso(),
      landmark("leftWrist", 15, 0.48, 0.2),
      landmark("rightWrist", 16, 0.52, 0.62, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-front-facing", orientation: "side" },
    });
    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      metadata: {
        reason: "active",
        activeSideCandidates: ["left"],
        leftVisible: true,
        rightVisible: false,
      },
    });
  });

  it("does not detect left, right, or both specific gestures for a side-facing one-hand raise", () => {
    const pose = createPose([
      ...sideFacingTorso(),
      landmark("leftWrist", 15, 0.48, 0.2),
      landmark("rightWrist", 16, 0.52, 0.62),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: {
        reason: "not-front-facing",
        orientation: "side",
        torsoWidth: expect.closeTo(0.04),
        torsoHeight: expect.closeTo(0.3),
        frontFacingScore: expect.closeTo(0.1333333333),
        frontFacingThreshold: 0.35,
      },
    });
    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: true,
      metadata: {
        reason: "active",
        activeSideCandidates: ["left"],
      },
    });
  });

  it("does not detect generic hand up when no hands are raised", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftWrist", 15, 0.3, 0.6),
      landmark("rightWrist", 16, 0.7, 0.6),
    ]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: false,
      metadata: {
        reason: "not-high-enough",
        activeSideCandidates: [],
        leftVisible: true,
        rightVisible: true,
      },
    });
  });

  it("does not detect generic hand up when the raised wrist has low visibility", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("leftWrist", 15, 0.3, 0.2, 0.4),
    ]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: false,
      metadata: {
        reason: "low-visibility",
        activeSideCandidates: [],
        leftVisible: false,
        rightVisible: false,
      },
    });
  });

  it("returns inactive generic hand up metadata when landmarks are missing", () => {
    const pose = createPose([landmark("leftShoulder", 11, 0.3, 0.4)]);

    expect(detectHandUp(pose)).toMatchObject({
      name: "handUp",
      active: false,
      confidence: 0,
      metadata: {
        reason: "missing-landmarks",
        activeSideCandidates: [],
        leftVisible: false,
        rightVisible: false,
        leftShoulderY: 0.4,
        yMargin: 0.03,
      },
    });
  });

  it("does not detect both hands up when side-facing with one hand up", () => {
    const pose = createPose([
      ...sideFacingTorso(),
      landmark("leftWrist", 15, 0.48, 0.2),
      landmark("rightWrist", 16, 0.52, 0.62),
    ]);

    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
  });

  it("does not emit leftHandUp for a side-facing right-hand raise", () => {
    const pose = createPose([
      ...sideFacingTorso(),
      landmark("leftWrist", 15, 0.49, 0.19),
      landmark("rightWrist", 16, 0.52, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
  });

  it("does not emit rightHandUp for a side-facing left-hand raise", () => {
    const pose = createPose([
      ...sideFacingTorso(),
      landmark("leftWrist", 15, 0.48, 0.2),
      landmark("rightWrist", 16, 0.51, 0.19),
    ]);

    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
  });

  it("does not detect both hands up when only the left hand is up", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.39),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({ name: "leftHandUp", active: true });
    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "not-high-enough" },
    });
  });

  it("does not detect both hands up when only the right hand is up", () => {
    const pose = createPose([
      ...closeFrontFacingTorso(),
      landmark("leftWrist", 15, 0.3, 0.39),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectRightHandUp(pose)).toMatchObject({ name: "rightHandUp", active: true });
    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "not-high-enough" },
    });
  });

  it("does not detect both hands up when a side-facing opposite wrist is low visibility", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.45, 0.4),
      landmark("rightShoulder", 12, 0.5, 0.4),
      landmark("leftHip", 23, 0.46, 0.7),
      landmark("rightHip", 24, 0.49, 0.7),
      landmark("leftWrist", 15, 0.42, 0.2),
      landmark("rightWrist", 16, 0.5, 0.19, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "not-front-facing" },
    });
  });

  it("does not detect active hand-up gestures with low-visibility landmarks", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4, 0.4),
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
      landmark("leftWrist", 15, 0.3, 0.2, 0.4),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "low-visibility" },
    });
    expect(detectRightHandUp(pose)).toMatchObject({
      name: "rightHandUp",
      active: false,
      metadata: { reason: "low-visibility" },
    });
    expect(detectBothHandsUp(pose)).toMatchObject({
      name: "bothHandsUp",
      active: false,
      metadata: { reason: "low-visibility" },
    });
  });

  it("does not detect a hand up when the wrist is below the shoulder", () => {
    const pose = createPose([...closeFrontFacingTorso(), landmark("leftWrist", 15, 0.3, 0.6)]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-high-enough" },
    });
  });

  it("does not detect a hand up when the wrist is only barely above the shoulder", () => {
    const pose = createPose([...closeFrontFacingTorso(), landmark("leftWrist", 15, 0.3, 0.38)]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-high-enough" },
    });
  });

  it("fails safely when hand landmarks are missing", () => {
    const pose = createPose([landmark("leftShoulder", 11, 0.3, 0.4)]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      active: false,
      confidence: 0,
      metadata: { reason: "missing-landmarks" },
    });
  });

  it("detects arms open when wrists extend outward at shoulder height", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.35, 0.4),
      landmark("rightShoulder", 12, 0.65, 0.4),
      landmark("leftWrist", 15, 0.1, 0.42),
      landmark("rightWrist", 16, 0.9, 0.42),
    ]);

    expect(detectArmsOpen(pose)).toMatchObject({ name: "armsOpen", active: true, confidence: 1 });
  });

  it("detects standing from shoulder, hip, knee, and ankle vertical ordering", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.35, 0.2),
      landmark("rightShoulder", 12, 0.65, 0.2),
      landmark("leftHip", 23, 0.4, 0.45),
      landmark("rightHip", 24, 0.6, 0.45),
      landmark("leftKnee", 25, 0.4, 0.7),
      landmark("rightKnee", 26, 0.6, 0.7),
      landmark("leftAnkle", 27, 0.4, 0.9),
      landmark("rightAnkle", 28, 0.6, 0.9),
    ]);

    expect(detectStanding(pose)).toMatchObject({ name: "standing", active: true, confidence: 1 });
  });

  it("fails safely when standing landmarks are missing", () => {
    expect(detectStanding(createPose([]))).toMatchObject({
      name: "standing",
      active: false,
      confidence: 0,
      metadata: { reason: "missing-landmarks" },
    });
  });
});

function createPose(landmarks: Landmark[]): PoseResult {
  return {
    timestamp: 123,
    landmarks,
    confidence: 1,
  };
}

function closeUpShoulders(): Landmark[] {
  return [
    landmark("leftShoulder", 11, 0.3, 0.4),
    landmark("rightShoulder", 12, 0.7, 0.4),
  ];
}

function closeFrontFacingTorso(): Landmark[] {
  return [
    landmark("leftShoulder", 11, 0.3, 0.4),
    landmark("rightShoulder", 12, 0.7, 0.4),
    landmark("leftHip", 23, 0.35, 0.7),
    landmark("rightHip", 24, 0.65, 0.7),
  ];
}

function smallFrontFacingTorso(): Landmark[] {
  return [
    landmark("leftShoulder", 11, 0.455, 0.35),
    landmark("rightShoulder", 12, 0.545, 0.35),
    landmark("leftHip", 23, 0.47, 0.55),
    landmark("rightHip", 24, 0.53, 0.55),
  ];
}

function sideFacingTorso(options: { rightShoulderVisibility?: number } = {}): Landmark[] {
  return [
    landmark("leftShoulder", 11, 0.48, 0.4),
    landmark("rightShoulder", 12, 0.52, 0.4, options.rightShoulderVisibility ?? 1),
    landmark("leftHip", 23, 0.49, 0.7),
    landmark("rightHip", 24, 0.51, 0.7),
  ];
}

function landmark(name: string, index: number, x: number, y: number, visibility = 1): Landmark {
  return {
    name,
    index,
    x,
    y,
    visibility,
  };
}
