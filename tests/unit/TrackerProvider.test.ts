import { describe, expect, it } from "vitest";

import { HolisticTracker, PoseTracker, TrackerProvider } from "../../src/trackers";

describe("TrackerProvider", () => {
  it("creates PoseTracker for pose mode", () => {
    const tracker = TrackerProvider.create({
      mode: "pose",
      pose: {
        modelAssetPath: "/pose.task",
        wasmAssetPath: "/wasm",
      },
    });

    expect(tracker).toBeInstanceOf(PoseTracker);
  });

  it("creates HolisticTracker placeholder for holistic mode", () => {
    const tracker = TrackerProvider.create({
      mode: "holistic",
      holistic: {
        modelAssetPath: "/holistic.task",
        wasmAssetPath: "/wasm",
      },
    });

    expect(tracker).toBeInstanceOf(HolisticTracker);
  });

  it("keeps holistic tracker clearly marked as not implemented", async () => {
    const tracker = TrackerProvider.create({ mode: "holistic" });

    await expect(tracker.initialize()).rejects.toThrow("HolisticTracker is not implemented yet.");
  });
});
