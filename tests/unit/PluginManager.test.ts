import { describe, expect, it, vi } from "vitest";

import { PluginManager } from "../../src/plugins";
import type { MotionPluginApi } from "../../src/plugins";

describe("PluginManager", () => {
  it("registers and unregisters plugins by name", () => {
    const manager = new PluginManager(createPluginApi());

    manager.register({ name: "custom-plugin" });

    expect(manager.has("custom-plugin")).toBe(true);
    expect(manager.unregister("custom-plugin")).toBe(true);
    expect(manager.has("custom-plugin")).toBe(false);
  });

  it("rejects duplicate plugin names", () => {
    const manager = new PluginManager(createPluginApi());

    manager.register({ name: "custom-plugin" });

    expect(() => manager.register({ name: "custom-plugin" })).toThrow('MotionPlugin "custom-plugin" is already registered.');
  });

  it("calls registered plugin callbacks", () => {
    const manager = new PluginManager(createPluginApi());
    const onPose = vi.fn();

    manager.register({ name: "pose-plugin", onPose });
    manager.notifyPose({
      timestamp: 1,
      confidence: 1,
      landmarks: [],
    });

    expect(onPose).toHaveBeenCalledWith(
      {
        timestamp: 1,
        confidence: 1,
        landmarks: [],
      },
      expect.objectContaining({
        emitGesture: expect.any(Function),
        emitExercise: expect.any(Function),
        getState: expect.any(Function),
      }),
    );
  });
});

function createPluginApi(): MotionPluginApi {
  return {
    emitGesture: vi.fn(),
    emitExercise: vi.fn(),
    getState: vi.fn(() => ({ status: "idle" })),
  };
}
