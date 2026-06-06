import { describe, expect, it, vi } from "vitest";

import { EventEmitter, MotionEvents } from "../../src/index";

describe("EventEmitter", () => {
  it("calls handlers registered with on when an event is emitted", () => {
    const emitter = new EventEmitter();
    const handler = vi.fn();
    const payload = {
      timestamp: 1,
      landmarks: [],
      confidence: 0.9,
    };

    emitter.on(MotionEvents.Pose, handler);
    emitter.emit(MotionEvents.Pose, payload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("removes a specific handler with off", () => {
    const emitter = new EventEmitter();
    const firstHandler = vi.fn();
    const secondHandler = vi.fn();
    const payload = {
      name: "wave",
      active: true,
      confidence: 0.8,
      timestamp: 2,
    };

    emitter.on(MotionEvents.Gesture, firstHandler);
    emitter.on(MotionEvents.Gesture, secondHandler);
    emitter.off(MotionEvents.Gesture, firstHandler);
    emitter.emit(MotionEvents.Gesture, payload);

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledOnce();
  });

  it("removes all handlers with removeAllListeners", () => {
    const emitter = new EventEmitter();
    const poseHandler = vi.fn();
    const errorHandler = vi.fn();

    emitter.on(MotionEvents.Pose, poseHandler);
    emitter.on(MotionEvents.Error, errorHandler);
    emitter.removeAllListeners();

    emitter.emit(MotionEvents.Pose, {
      timestamp: 3,
      landmarks: [],
      confidence: 1,
    });
    emitter.emit(MotionEvents.Error, {
      message: "Camera permission denied",
    });

    expect(poseHandler).not.toHaveBeenCalled();
    expect(errorHandler).not.toHaveBeenCalled();
  });

  it("keeps listener changes during emit scoped to the current event dispatch", () => {
    const emitter = new EventEmitter();
    const firstHandler = vi.fn(() => {
      emitter.off(MotionEvents.Started, secondHandler);
    });
    const secondHandler = vi.fn();
    const payload = { timestamp: 4 };

    emitter.on(MotionEvents.Started, firstHandler);
    emitter.on(MotionEvents.Started, secondHandler);
    emitter.emit(MotionEvents.Started, payload);
    emitter.emit(MotionEvents.Started, payload);

    expect(firstHandler).toHaveBeenCalledTimes(2);
    expect(secondHandler).toHaveBeenCalledTimes(1);
  });
});
