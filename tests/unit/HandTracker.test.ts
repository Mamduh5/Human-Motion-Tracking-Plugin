import { beforeEach, describe, expect, it, vi } from "vitest";

const mediapipeMocks = vi.hoisted(() => ({
  forVisionTasks: vi.fn(),
  createFromOptions: vi.fn(),
}));

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: mediapipeMocks.forVisionTasks,
  },
  HandLandmarker: {
    createFromOptions: mediapipeMocks.createFromOptions,
  },
}));

import { HAND_LANDMARK_NAMES } from "../../src/index";
import { convertHandLandmarkerResult, HandTracker } from "../../src/trackers";

describe("HandTracker", () => {
  beforeEach(() => {
    mediapipeMocks.forVisionTasks.mockReset();
    mediapipeMocks.createFromOptions.mockReset();
  });

  it("maps the 21 MediaPipe hand landmark names", () => {
    expect(HAND_LANDMARK_NAMES).toHaveLength(21);
    expect(HAND_LANDMARK_NAMES).toEqual([
      "wrist",
      "thumbCmc",
      "thumbMcp",
      "thumbIp",
      "thumbTip",
      "indexFingerMcp",
      "indexFingerPip",
      "indexFingerDip",
      "indexFingerTip",
      "middleFingerMcp",
      "middleFingerPip",
      "middleFingerDip",
      "middleFingerTip",
      "ringFingerMcp",
      "ringFingerPip",
      "ringFingerDip",
      "ringFingerTip",
      "pinkyMcp",
      "pinkyPip",
      "pinkyDip",
      "pinkyTip",
    ]);
  });

  it("converts handedness and landmarks into SDK hand results", () => {
    const result = convertHandLandmarkerResult(
      {
        landmarks: [createHandLandmarks(0), createHandLandmarks(0.1)],
        worldLandmarks: [createHandLandmarks(1), createHandLandmarks(2)],
        handednesses: [
          [{ categoryName: "Left", score: 0.9 }],
          [{ categoryName: "Right", score: 0.8 }],
        ],
      },
      1234,
    );

    expect(result).toMatchObject({
      timestamp: 1234,
      hands: [
        {
          handedness: "left",
          handednessScore: 0.9,
        },
        {
          handedness: "right",
          handednessScore: 0.8,
        },
      ],
    });
    expect(result?.confidence).toBeCloseTo(0.85);
    expect(result?.hands[0].landmarks).toHaveLength(21);
    expect(result?.hands[0].landmarks[0]).toEqual({
      name: "wrist",
      index: 0,
      x: 0,
      y: 0.01,
      z: -0,
    });
    expect(result?.hands[0].worldLandmarks?.[0]).toMatchObject({
      name: "wrist",
      index: 0,
      x: 1,
    });
  });

  it("returns null safely when no hands are detected", () => {
    expect(convertHandLandmarkerResult({ landmarks: [] }, 1234)).toBeNull();
    expect(convertHandLandmarkerResult({ landmarks: [[]] }, 1234)).toBeNull();
  });

  it("initializes MediaPipe HandLandmarker with VIDEO running mode", async () => {
    const close = vi.fn();

    mediapipeMocks.forVisionTasks.mockResolvedValue("vision");
    mediapipeMocks.createFromOptions.mockResolvedValue({
      close,
      detectForVideo: vi.fn(),
    });

    const tracker = new HandTracker({
      modelAssetPath: "/hand.task",
      wasmAssetPath: "/wasm",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    await tracker.initialize();
    tracker.dispose();

    expect(mediapipeMocks.forVisionTasks).toHaveBeenCalledWith("/wasm");
    expect(mediapipeMocks.createFromOptions).toHaveBeenCalledWith("vision", {
      baseOptions: {
        modelAssetPath: "/hand.task",
      },
      runningMode: "VIDEO",
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    expect(close).toHaveBeenCalledOnce();
  });
});

function createHandLandmarks(offset: number): Array<{ x: number; y: number; z: number }> {
  return Array.from({ length: 21 }, (_, index) => ({
    x: offset + index / 100,
    y: offset + index / 100 + 0.01,
    z: -index / 100,
  }));
}
