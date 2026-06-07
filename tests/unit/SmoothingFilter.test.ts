import { describe, expect, it } from "vitest";

import { SmoothingFilter, smoothLandmarks } from "../../src/normalizers";
import type { Landmark } from "../../src/types";

describe("SmoothingFilter", () => {
  it("applies exponential smoothing between previous and current landmarks", () => {
    const previous: Landmark[] = [{ name: "nose", index: 0, x: 0, y: 0, z: 0, visibility: 0.5 }];
    const current: Landmark[] = [{ name: "nose", index: 0, x: 10, y: 20, z: 2, visibility: 1 }];

    expect(smoothLandmarks(current, previous, 0.25)).toEqual([
      { name: "nose", index: 0, x: 2.5, y: 5, z: 0.5, visibility: 0.625 },
    ]);
  });

  it("returns first-frame landmarks unchanged when no previous state exists", () => {
    const filter = new SmoothingFilter({ alpha: 0.5 });
    const landmarks: Landmark[] = [{ name: "nose", index: 0, x: 10, y: 20, visibility: 1 }];

    expect(filter.apply(landmarks)).toEqual(landmarks);
  });

  it("stores smoothed state across frames", () => {
    const filter = new SmoothingFilter({ alpha: 0.5 });

    filter.apply([{ name: "nose", index: 0, x: 0, y: 0 }]);

    expect(filter.apply([{ name: "nose", index: 0, x: 10, y: 20 }])).toEqual([
      { name: "nose", index: 0, x: 5, y: 10, z: undefined, visibility: undefined },
    ]);
  });
});
