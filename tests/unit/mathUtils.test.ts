import { describe, expect, it } from "vitest";

import { averageConfidence, calculateAngle, distance2D, distance3D, isLandmarkVisible } from "../../src/utils";

describe("motion math utilities", () => {
  it("calculates the angle at point b", () => {
    expect(calculateAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
    expect(calculateAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(180);
  });

  it("returns 0 for angles with a zero-length segment", () => {
    expect(calculateAngle({ x: 1, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBe(0);
  });

  it("calculates 2D distance", () => {
    expect(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("calculates 3D distance", () => {
    expect(distance3D({ x: 0, y: 0, z: 0 }, { x: 2, y: 3, z: 6 })).toBe(7);
  });

  it("averages visibility values as confidence", () => {
    expect(averageConfidence([{ visibility: 0.25 }, { visibility: 0.75 }])).toBe(0.5);
  });

  it("checks landmark visibility against a threshold", () => {
    expect(isLandmarkVisible({ visibility: 0.6 }, 0.5)).toBe(true);
    expect(isLandmarkVisible({ visibility: 0.4 }, 0.5)).toBe(false);
  });
});
