import { describe, expect, it } from "vitest";

import {
  filterLandmarksByVisibility,
  getLandmarkByName,
  getPoseLandmarkName,
  normalizeLandmarks,
} from "../../src/normalizers";
import type { Landmark } from "../../src/types";

describe("LandmarkNormalizer", () => {
  it("maps MediaPipe pose indexes to readable landmark names", () => {
    expect(getPoseLandmarkName(0)).toBe("nose");
    expect(getPoseLandmarkName(11)).toBe("leftShoulder");
    expect(getPoseLandmarkName(24)).toBe("rightHip");
    expect(getPoseLandmarkName(32)).toBe("rightFootIndex");
  });

  it("adds names and indexes to unnamed landmarks", () => {
    expect(
      normalizeLandmarks([
        { x: 0.1, y: 0.2, visibility: 0.9 },
        { x: 0.3, y: 0.4, visibility: 0.8 },
      ]),
    ).toEqual([
      { name: "nose", index: 0, x: 0.1, y: 0.2, z: undefined, visibility: 0.9 },
      { name: "leftEyeInner", index: 1, x: 0.3, y: 0.4, z: undefined, visibility: 0.8 },
    ]);
  });

  it("gets landmarks by name", () => {
    const landmarks = createLandmarks();

    expect(getLandmarkByName(landmarks, "leftShoulder")).toEqual({
      name: "leftShoulder",
      index: 11,
      x: 0.2,
      y: 0.3,
      visibility: 0.9,
    });
  });

  it("filters landmarks by minimum visibility", () => {
    expect(filterLandmarksByVisibility(createLandmarks(), 0.75).map((landmark) => landmark.name)).toEqual([
      "leftShoulder",
      "rightShoulder",
      "leftHip",
      "rightHip",
    ]);
  });
});

function createLandmarks(): Landmark[] {
  return [
    { name: "nose", index: 0, x: 0.5, y: 0.1, visibility: 0.5 },
    { name: "leftShoulder", index: 11, x: 0.2, y: 0.3, visibility: 0.9 },
    { name: "rightShoulder", index: 12, x: 0.8, y: 0.3, visibility: 0.8 },
    { name: "leftHip", index: 23, x: 0.3, y: 0.8, visibility: 0.85 },
    { name: "rightHip", index: 24, x: 0.7, y: 0.8, visibility: 0.95 },
  ];
}
