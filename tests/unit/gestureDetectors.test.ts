import { describe, expect, it } from "vitest";

import { detectArmsOpen, detectBothHandsUp, detectLeftHandUp, detectRightHandUp, detectStanding } from "../../src/detectors";
import type { Landmark, PoseResult } from "../../src/types";

describe("gesture detectors", () => {
  it("detects left, right, and both hands up", () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);

    expect(detectLeftHandUp(pose)).toMatchObject({ name: "leftHandUp", active: true, confidence: 1 });
    expect(detectRightHandUp(pose)).toMatchObject({ name: "rightHandUp", active: true, confidence: 1 });
    expect(detectBothHandsUp(pose)).toMatchObject({ name: "bothHandsUp", active: true, confidence: 1 });
  });

  it("does not detect a hand up when the wrist is below the shoulder", () => {
    const pose = createPose([landmark("leftShoulder", 11, 0.3, 0.4), landmark("leftWrist", 15, 0.3, 0.6)]);

    expect(detectLeftHandUp(pose)).toMatchObject({ name: "leftHandUp", active: false });
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
