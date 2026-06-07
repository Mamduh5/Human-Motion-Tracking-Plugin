import { describe, expect, it } from "vitest";

import {
  clearCalibration,
  loadCalibration,
  parseCalibration,
  saveCalibration,
  serializeCalibration,
  validateCalibrationResult,
  type CalibrationStorage,
} from "../../src/calibration";
import type { CalibrationResult } from "../../src/types";

describe("calibration persistence", () => {
  it("serializes and parses a calibration result round trip", () => {
    const result = createCalibrationResult();
    const serialized = serializeCalibration(result);

    expect(parseCalibration(serialized)).toEqual(result);
    expect(validateCalibrationResult(result)).toBe(true);
  });

  it("fails safely when parsing invalid calibration data", () => {
    expect(() => parseCalibration("{")).toThrow("Invalid calibration data");
    expect(() => parseCalibration(JSON.stringify({ status: "completed" }))).toThrow("Invalid calibration data");
    expect(validateCalibrationResult({ status: "completed" })).toBe(false);
  });

  it("saves, loads, and clears calibration with a mocked Storage object", () => {
    const storage = createStorageMock();
    const result = createCalibrationResult();

    expect(saveCalibration("motionCalibration", result, storage)).toBe(true);
    expect(loadCalibration("motionCalibration", storage)).toEqual(result);
    expect(clearCalibration("motionCalibration", storage)).toBe(true);
    expect(loadCalibration("motionCalibration", storage)).toBeUndefined();
  });

  it("does not crash when localStorage is unavailable", () => {
    expect(saveCalibration("motionCalibration", createCalibrationResult())).toBe(false);
    expect(loadCalibration("motionCalibration")).toBeUndefined();
    expect(clearCalibration("motionCalibration")).toBe(false);
  });
});

function createStorageMock(): CalibrationStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function createCalibrationResult(): CalibrationResult {
  return {
    status: "completed",
    timestamp: 1234,
    sampleCount: 12,
    quality: "good",
    metrics: {
      shoulderWidth: 0.4,
      hipWidth: 0.3,
      torsoHeight: 0.35,
      bodyScale: 0.375,
      leftArmLength: 0.25,
      rightArmLength: 0.25,
      averageVisibility: 0.92,
      frontFacingScore: 1.1,
    },
    recommendedThresholds: {
      minVisibility: 0.55,
      handUpYMargin: 0.02,
      frontFacingScore: 0.4,
    },
    warnings: ["Low visibility"],
  };
}
