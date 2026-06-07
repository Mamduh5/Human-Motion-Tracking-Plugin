import { describe, expect, it } from "vitest";

import { CalibrationManager } from "../../src/calibration";
import type { Landmark, PoseResult } from "../../src/types";

describe("CalibrationManager", () => {
  it("collects usable pose samples and completes with a result", () => {
    let now = 0;
    const manager = new CalibrationManager({ now: () => now });

    manager.start({ durationMs: 1000, minSamples: 2 });
    manager.addPoseSample(createCalibrationPose());
    manager.addPoseSample(createCalibrationPose());
    now = 1000;

    const result = manager.complete();

    expect(result).toMatchObject({
      status: "completed",
      sampleCount: 2,
      quality: "good",
    });
    expect(manager.getStatus()).toBe("completed");
    expect(manager.getResult()).toBe(result);
  });

  it("computes shoulder width and torso height from median pose metrics", () => {
    const manager = new CalibrationManager({ now: () => 1000 });

    manager.start({ durationMs: 1000, minSamples: 1 });
    manager.addPoseSample(createCalibrationPose());

    const result = manager.complete();

    expect(result.metrics.shoulderWidth).toBeCloseTo(0.4);
    expect(result.metrics.torsoHeight).toBeCloseTo(0.4);
    expect(result.metrics.bodyScale).toBeCloseTo(0.4);
  });

  it("computes left and right arm length", () => {
    const manager = new CalibrationManager({ now: () => 1000 });

    manager.start({ durationMs: 1000, minSamples: 1 });
    manager.addPoseSample(createCalibrationPose());

    const result = manager.complete();

    expect(result.metrics.leftArmLength).toBeCloseTo(0.2);
    expect(result.metrics.rightArmLength).toBeCloseTo(0.2);
  });

  it("ignores unusable low-visibility samples", () => {
    const manager = new CalibrationManager({ now: () => 1000 });

    manager.start({ durationMs: 1000, minSamples: 1, minVisibility: 0.5 });
    manager.addPoseSample(createCalibrationPose(0.1));
    manager.addPoseSample(createCalibrationPose());

    const result = manager.complete();

    expect(result.sampleCount).toBe(1);
    expect(result.metrics.averageVisibility).toBeCloseTo(1);
  });

  it("returns poor quality with a too-small sample set", () => {
    const manager = new CalibrationManager({ now: () => 1000 });

    manager.start({ durationMs: 1000, minSamples: 5 });
    manager.addPoseSample(createCalibrationPose());

    const result = manager.complete();

    expect(result.quality).toBe("poor");
    expect(result.warnings).toContain("Too few samples");
  });

  it("returns conservative recommended gesture thresholds", () => {
    const manager = new CalibrationManager({ now: () => 1000 });

    manager.start({ durationMs: 1000, minSamples: 1 });
    manager.addPoseSample(createCalibrationPose());

    const result = manager.complete();

    expect(result.recommendedThresholds).toMatchObject({
      minVisibility: expect.any(Number),
      handUpYMargin: expect.any(Number),
      frontFacingScore: expect.any(Number),
      handsOnHipsDistance: expect.any(Number),
      crossedArmsDistance: expect.any(Number),
      armsOpenXMargin: expect.any(Number),
    });
    expect(result.recommendedThresholds.handUpYMargin).toBeGreaterThanOrEqual(0.015);
    expect(result.recommendedThresholds.handUpYMargin).toBeLessThanOrEqual(0.055);
  });

  it("fails when every observed sample is unusable", () => {
    const manager = new CalibrationManager({ now: () => 1000 });

    manager.start({ durationMs: 1000, minSamples: 1, minVisibility: 0.5 });
    manager.addPoseSample(createCalibrationPose(0.1));

    expect(() => manager.complete()).toThrow("no usable pose samples");
    expect(manager.getStatus()).toBe("failed");
  });
});

function createCalibrationPose(visibility = 1): PoseResult {
  return {
    timestamp: 123,
    confidence: 1,
    landmarks: [
      landmark("leftShoulder", 11, 0.3, 0.2, visibility),
      landmark("rightShoulder", 12, 0.7, 0.2, visibility),
      landmark("leftHip", 23, 0.35, 0.6, visibility),
      landmark("rightHip", 24, 0.65, 0.6, visibility),
      landmark("leftElbow", 13, 0.2, 0.2, visibility),
      landmark("rightElbow", 14, 0.8, 0.2, visibility),
      landmark("leftWrist", 15, 0.1, 0.2, visibility),
      landmark("rightWrist", 16, 0.9, 0.2, visibility),
    ],
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
