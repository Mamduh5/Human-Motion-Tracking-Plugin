import { describe, expect, it } from "vitest";

import { HandSmoothingFilter } from "../../src/trackers";
import type { HandResult } from "../../src/types";

describe("HandSmoothingFilter", () => {
  it("smooths hand landmark positions", () => {
    const filter = new HandSmoothingFilter({ factor: 0.35 });

    filter.update(createHandResult(0));
    const result = filter.update(createHandResult(1));

    expect(result.hands[0].landmarks[0].x).toBeCloseTo(0.35);
    expect(result.hands[0].landmarks[0].y).toBeCloseTo(0.35);
    expect(result.hands[0].landmarks[0].z).toBeCloseTo(0.35);
  });

  it("clears prior state on reset", () => {
    const filter = new HandSmoothingFilter({ factor: 0.35 });

    filter.update(createHandResult(0));
    filter.reset();
    const result = filter.update(createHandResult(1));

    expect(result.hands[0].landmarks[0].x).toBe(1);
    expect(result.hands[0].landmarks[0].y).toBe(1);
    expect(result.hands[0].landmarks[0].z).toBe(1);
  });
});

function createHandResult(value: number): HandResult {
  return {
    timestamp: 1,
    confidence: 0.9,
    hands: [
      {
        handedness: "right",
        handednessScore: 0.9,
        landmarks: [
          {
            name: "wrist",
            index: 0,
            x: value,
            y: value,
            z: value,
          },
        ],
      },
    ],
  };
}
