import { describe, expect, it } from "vitest";

import { HandIdentityTracker } from "../../src/trackers";
import type { DetectedHand, HandResult, Handedness } from "../../src/types";

describe("HandIdentityTracker", () => {
  it("keeps identity stable across a one-frame handedness flip when position is close", () => {
    const tracker = new HandIdentityTracker();

    tracker.update(createHandResult("left", 0.4, 0.5));
    const result = tracker.update(createHandResult("right", 0.405, 0.5));

    expect(result.hands[0].handedness).toBe("left");
    expect(result.hands[0].handednessScore).toBe(0.9);
  });

  it("allows a true handedness switch when position changes significantly", () => {
    const tracker = new HandIdentityTracker();

    tracker.update(createHandResult("left", 0.2, 0.5));
    const result = tracker.update(createHandResult("right", 0.8, 0.5));

    expect(result.hands[0].handedness).toBe("right");
  });
});

function createHandResult(handedness: Handedness, x: number, y: number): HandResult {
  return {
    timestamp: 1,
    confidence: 0.9,
    hands: [createHand(handedness, x, y)],
  };
}

function createHand(handedness: Handedness, x: number, y: number): DetectedHand {
  return {
    handedness,
    handednessScore: 0.9,
    landmarks: [
      {
        name: "wrist",
        index: 0,
        x,
        y,
      },
      {
        name: "indexFingerMcp",
        index: 5,
        x: x + 0.01,
        y,
      },
      {
        name: "middleFingerMcp",
        index: 9,
        x,
        y: y - 0.01,
      },
    ],
  };
}
