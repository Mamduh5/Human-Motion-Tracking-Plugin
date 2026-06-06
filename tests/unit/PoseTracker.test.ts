import { describe, expect, it } from "vitest";

import { convertPoseLandmarkerResult } from "../../src/trackers/PoseTracker";

describe("convertPoseLandmarkerResult", () => {
  it("converts the first MediaPipe pose into the SDK PoseResult shape", () => {
    const result = convertPoseLandmarkerResult(
      {
        landmarks: [
          [
            { x: 0.1, y: 0.2, z: -0.01, visibility: 0.9 },
            { x: 0.3, y: 0.4, z: -0.02, visibility: 0.7 },
          ],
        ],
        worldLandmarks: [
          [
            { x: 1, y: 2, z: 3, visibility: 0.8 },
            { x: 4, y: 5, z: 6, visibility: 0.6 },
          ],
        ],
      },
      1234,
    );

    expect(result).toEqual({
      timestamp: 1234,
      confidence: 0.8,
      landmarks: [
        { name: "nose", index: 0, x: 0.1, y: 0.2, z: -0.01, visibility: 0.9 },
        { name: "leftEyeInner", index: 1, x: 0.3, y: 0.4, z: -0.02, visibility: 0.7 },
      ],
      worldLandmarks: [
        { name: "nose", index: 0, x: 1, y: 2, z: 3, visibility: 0.8 },
        { name: "leftEyeInner", index: 1, x: 4, y: 5, z: 6, visibility: 0.6 },
      ],
    });
  });

  it("returns null when MediaPipe reports no pose", () => {
    const result = convertPoseLandmarkerResult(
      {
        landmarks: [],
      },
      1234,
    );

    expect(result).toBeNull();
  });
});
