import { describe, expect, it } from "vitest";

import { calculateBodyCenter, calculateBodyScale } from "../../src/normalizers";
import type { Landmark } from "../../src/types";

describe("CoordinateMapper", () => {
  it("calculates body center from shoulders and hips", () => {
    expect(calculateBodyCenter(createBodyLandmarks())).toEqual({ x: 0.5, y: 0.5 });
  });

  it("uses shoulder width as body scale when both shoulders exist", () => {
    expect(calculateBodyScale(createBodyLandmarks())).toBeCloseTo(0.6);
  });

  it("falls back to hip-to-shoulder distance when one shoulder is missing", () => {
    const landmarks = createBodyLandmarks().filter((landmark) => landmark.name !== "rightShoulder");

    expect(calculateBodyScale(landmarks)).toBeCloseTo(0.583095);
  });
});

function createBodyLandmarks(): Landmark[] {
  return [
    { name: "leftShoulder", index: 11, x: 0.2, y: 0.25 },
    { name: "rightShoulder", index: 12, x: 0.8, y: 0.25 },
    { name: "leftHip", index: 23, x: 0.3, y: 0.75 },
    { name: "rightHip", index: 24, x: 0.7, y: 0.75 },
  ];
}
