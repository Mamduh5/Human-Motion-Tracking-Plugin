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
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
      landmark("leftWrist", 15, 0.3, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: true,
      confidence: 1,
      metadata: expect.objectContaining({
        reason: "active",
        torsoWidth: expect.any(Number),
        wristY: 0.2,
        shoulderY: 0.4,
        yMargin: 0.03,
        requiredVisibility: {
          leftWrist: 1,
          leftShoulder: 1,
        },
      }),
    });
  });

  it("detects right hand up front-facing", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectRightHandUp(pose)).toMatchObject({ name: "rightHandUp", active: true, confidence: 1 });
  });

  it("detects both hands up front-facing", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({ name: "leftHandUp", active: true, confidence: 1 });
    expect(detectRightHandUp(pose)).toMatchObject({ name: "rightHandUp", active: true, confidence: 1 });
    expect(detectBothHandsUp(pose)).toMatchObject({ name: "bothHandsUp", active: true, confidence: 1 });
  });

  it("detects generic hand up for a front-facing left hand raise", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
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
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
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
      landmark("leftShoulder", 11, 0.48, 0.4),
      landmark("rightShoulder", 12, 0.52, 0.4, 0.2),
      landmark("leftHip", 23, 0.49, 0.7),
      landmark("rightHip", 24, 0.51, 0.7),
      landmark("leftWrist", 15, 0.48, 0.2),
      landmark("rightWrist", 16, 0.52, 0.62, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-front-facing" },
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
      landmark("leftShoulder", 11, 0.48, 0.4),
      landmark("rightShoulder", 12, 0.52, 0.4),
      landmark("leftHip", 23, 0.49, 0.7),
      landmark("rightHip", 24, 0.51, 0.7),
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
      landmark("leftShoulder", 11, 0.48, 0.4),
      landmark("rightShoulder", 12, 0.52, 0.4),
      landmark("leftHip", 23, 0.49, 0.7),
      landmark("rightHip", 24, 0.51, 0.7),
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
      landmark("leftShoulder", 11, 0.48, 0.4),
      landmark("rightShoulder", 12, 0.52, 0.4),
      landmark("leftHip", 23, 0.49, 0.7),
      landmark("rightHip", 24, 0.51, 0.7),
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
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
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
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
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
    const pose = createPose([landmark("leftShoulder", 11, 0.3, 0.4), landmark("leftWrist", 15, 0.3, 0.6)]);

    expect(detectLeftHandUp(pose)).toMatchObject({
      name: "leftHandUp",
      active: false,
      metadata: { reason: "not-high-enough" },
    });
  });

  it("does not detect a hand up when the wrist is only barely above the shoulder", () => {
    const pose = createPose([landmark("leftShoulder", 11, 0.3, 0.4), landmark("leftWrist", 15, 0.3, 0.38)]);

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

function landmark(name: string, index: number, x: number, y: number, visibility = 1): Landmark {
  return {
    name,
    index,
    x,
    y,
    visibility,
  };
}
