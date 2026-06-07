import { describe, expect, it } from "vitest";

import { SquatAnalyzer } from "../../src/detectors";
import type { Landmark, PoseResult } from "../../src/types";

describe("SquatAnalyzer", () => {
  it("detects up and down squat stages from knee angle", () => {
    const analyzer = new SquatAnalyzer();

    expect(analyzer.analyze(createPose(createUpLegs(), 1))).toMatchObject({
      name: "squat",
      stage: "up",
      reps: 0,
      confidence: 1,
    });
    expect(analyzer.analyze(createPose(createDownLegs(), 2))).toMatchObject({
      name: "squat",
      stage: "down",
      reps: 0,
      confidence: 1,
    });
  });

  it("counts one rep when moving from down back to up", () => {
    const analyzer = new SquatAnalyzer();

    analyzer.analyze(createPose(createUpLegs(), 1));
    analyzer.analyze(createPose(createDownLegs(), 2));
    const result = analyzer.analyze(createPose(createUpLegs(), 3));

    expect(result).toMatchObject({
      name: "squat",
      stage: "up",
      reps: 1,
      confidence: 1,
    });
  });

  it("does not count repeated up frames as extra reps", () => {
    const analyzer = new SquatAnalyzer();

    analyzer.analyze(createPose(createDownLegs(), 1));
    analyzer.analyze(createPose(createUpLegs(), 2));
    const result = analyzer.analyze(createPose(createUpLegs(), 3));

    expect(result.reps).toBe(1);
  });

  it("uses one visible leg when the other leg is missing", () => {
    const analyzer = new SquatAnalyzer();
    const result = analyzer.analyze(createPose(createLeftDownLeg(), 1));

    expect(result).toMatchObject({
      stage: "down",
      confidence: 1,
      metadata: {
        legsUsed: ["left"],
      },
    });
  });

  it("returns unknown safely when required landmarks are missing", () => {
    const analyzer = new SquatAnalyzer();
    const result = analyzer.analyze(createPose([], 1));

    expect(result).toMatchObject({
      name: "squat",
      stage: "unknown",
      reps: 0,
      confidence: 0,
      warnings: ["Missing or low-visibility hip, knee, or ankle landmarks."],
    });
  });
});

function createUpLegs(): Landmark[] {
  return [
    ...createLeftUpLeg(),
    landmark("rightHip", 24, 1, 0),
    landmark("rightKnee", 26, 1, 1),
    landmark("rightAnkle", 28, 1, 2),
  ];
}

function createDownLegs(): Landmark[] {
  return [
    ...createLeftDownLeg(),
    landmark("rightHip", 24, 1, 0),
    landmark("rightKnee", 26, 1, 1),
    landmark("rightAnkle", 28, 2, 1),
  ];
}

function createLeftUpLeg(): Landmark[] {
  return [landmark("leftHip", 23, 0, 0), landmark("leftKnee", 25, 0, 1), landmark("leftAnkle", 27, 0, 2)];
}

function createLeftDownLeg(): Landmark[] {
  return [landmark("leftHip", 23, 0, 0), landmark("leftKnee", 25, 0, 1), landmark("leftAnkle", 27, 1, 1)];
}

function createPose(landmarks: Landmark[], timestamp: number): PoseResult {
  return {
    timestamp,
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
