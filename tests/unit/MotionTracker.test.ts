import { describe, expect, it, vi } from "vitest";

import { MotionTracker } from "../../src/core";
import type { CameraSource } from "../../src/camera";
import type { MotionLandmarkTracker } from "../../src/trackers";
import type { Landmark, MotionTrackerConfig, PoseResult } from "../../src/types";

describe("MotionTracker", () => {
  it("starts camera and tracker, emits started, and schedules a frame", async () => {
    const { tracker, camera, landmarkTracker, raf } = createMotionTracker();
    const startedHandler = vi.fn();

    tracker.on("started", startedHandler);
    await tracker.start();

    expect(landmarkTracker.initialize).toHaveBeenCalledOnce();
    expect(camera.start).toHaveBeenCalledOnce();
    expect(startedHandler).toHaveBeenCalledWith({ timestamp: 100 });
    expect(raf.requestAnimationFrame).toHaveBeenCalledOnce();
    expect(tracker.getState()).toMatchObject({ status: "running", startedAt: 100 });
  });

  it("detects pose on animation frames and emits pose and gesture events", async () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("rightShoulder", 12, 0.7, 0.4),
      landmark("leftWrist", 15, 0.3, 0.2),
      landmark("rightWrist", 16, 0.7, 0.2),
    ]);
    const { tracker, landmarkTracker, raf } = createMotionTracker({
      landmarkTracker: createLandmarkTrackerMock(pose),
      config: {
        gestures: {
          enabled: true,
          names: ["leftHandUp"],
          minConfidence: 0,
        },
      },
    });
    const poseHandler = vi.fn();
    const gestureHandler = vi.fn();

    tracker.on("pose", poseHandler);
    tracker.on("gesture", gestureHandler);
    await tracker.start();
    raf.flushFrame(1234);

    expect(landmarkTracker.detect).toHaveBeenCalledWith(expect.anything(), 1234);
    expect(poseHandler).toHaveBeenCalledWith(pose);
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp", active: true }));
    expect(tracker.getState()).toMatchObject({ status: "running", lastFrameTimestamp: 1234 });
  });

  it("removes event handlers with off", async () => {
    const { tracker, raf } = createMotionTracker({ landmarkTracker: createLandmarkTrackerMock(createPose([])) });
    const poseHandler = vi.fn();

    tracker.on("pose", poseHandler);
    tracker.off("pose", poseHandler);
    await tracker.start();
    raf.flushFrame(10);

    expect(poseHandler).not.toHaveBeenCalled();
  });

  it("stops the loop and camera", async () => {
    const { tracker, camera, landmarkTracker, raf } = createMotionTracker();
    const stoppedHandler = vi.fn();

    tracker.on("stopped", stoppedHandler);
    await tracker.start();
    tracker.stop();

    expect(raf.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(camera.stop).toHaveBeenCalledOnce();
    expect(landmarkTracker.dispose).toHaveBeenCalledOnce();
    expect(stoppedHandler).toHaveBeenCalledWith({ timestamp: 101 });
    expect(tracker.getState()).toMatchObject({ status: "stopped", stoppedAt: 101 });
  });

  it("emits error when frame detection fails", async () => {
    const error = new Error("detect failed");
    const { tracker, camera, raf } = createMotionTracker({
      landmarkTracker: createLandmarkTrackerMock(null, error),
    });
    const errorHandler = vi.fn();

    tracker.on("error", errorHandler);
    await tracker.start();
    raf.flushFrame(1234);

    expect(errorHandler).toHaveBeenCalledWith({ message: "detect failed", cause: error });
    expect(camera.stop).toHaveBeenCalledOnce();
  });
});

interface CreateMotionTrackerOptions {
  config?: PartialMotionTrackerConfig;
  landmarkTracker?: MotionLandmarkTracker;
}

type PartialMotionTrackerConfig = Partial<Omit<MotionTrackerConfig, "gestures">> & {
  gestures?: Partial<MotionTrackerConfig["gestures"]>;
};

function createMotionTracker(options: CreateMotionTrackerOptions = {}) {
  const camera = createCameraMock();
  const landmarkTracker = options.landmarkTracker ?? createLandmarkTrackerMock(createPose([]));
  const raf = createRafMock();
  const timestamps = [100, 101, 102];
  const tracker = new MotionTracker(createConfig(options.config), {
    camera,
    landmarkTracker,
    requestAnimationFrame: raf.requestAnimationFrame,
    cancelAnimationFrame: raf.cancelAnimationFrame,
    now: () => timestamps.shift() ?? 999,
  });

  return {
    tracker,
    camera,
    landmarkTracker,
    raf,
  };
}

function createConfig(overrides: PartialMotionTrackerConfig = {}): MotionTrackerConfig {
  return {
    mode: "pose",
    camera: {},
    pose: {
      modelAssetPath: "/pose.task",
      wasmAssetPath: "/wasm",
    },
    gestures: {
      enabled: false,
      ...overrides.gestures,
    },
    exercises: {
      enabled: false,
    },
    minConfidence: 0,
    smoothing: {
      enabled: false,
    },
    ...overrides,
  };
}

function createCameraMock(): CameraSource {
  return {
    start: vi.fn().mockResolvedValue({} as HTMLVideoElement),
    stop: vi.fn(),
    getVideoElement: vi.fn(() => ({} as HTMLVideoElement)),
    isRunning: vi.fn(() => true),
  };
}

function createLandmarkTrackerMock(pose: PoseResult | null, detectError?: Error): MotionLandmarkTracker {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    detect: vi.fn(() => {
      if (detectError) {
        throw detectError;
      }

      return pose;
    }),
    dispose: vi.fn(),
  };
}

function createRafMock() {
  const callbacks: FrameRequestCallback[] = [];

  return {
    requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
      callbacks.push(callback);

      return callbacks.length;
    }),
    cancelAnimationFrame: vi.fn(),
    flushFrame: (timestamp: number) => {
      const callback = callbacks.shift();

      if (!callback) {
        throw new Error("No animation frame callback was scheduled.");
      }

      callback(timestamp);
    },
  };
}

function createPose(landmarks: Landmark[]): PoseResult {
  return {
    timestamp: 1234,
    landmarks,
    confidence: 1,
  };
}

function landmark(name: string, index: number, x: number, y: number, visibility = 1): Landmark {
  return {
    name,
    index,
    x,
    y,
    visibility,
  };
}
