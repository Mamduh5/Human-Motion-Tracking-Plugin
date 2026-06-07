import { describe, expect, it, vi } from "vitest";

import { MotionTracker, resolveMotionTrackerConfig } from "../../src/core";
import type { CameraSource } from "../../src/camera";
import type { MotionPlugin } from "../../src/plugins";
import type { MotionLandmarkTracker } from "../../src/trackers";
import type { Landmark, MotionTrackerConfig, PoseResult } from "../../src/types";

describe("MotionTracker", () => {
  it("defaults performance config to the balanced profile", () => {
    const config = createConfig();

    delete config.performance;

    expect(resolveMotionTrackerConfig(config).performance).toEqual({
      profile: "balanced",
      targetFps: 15,
      adaptive: false,
    });
  });

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
      landmark("leftHip", 23, 0.35, 0.7),
      landmark("rightHip", 24, 0.65, 0.7),
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
    raf.flushFrame(1235);
    raf.flushFrame(1236);

    expect(landmarkTracker.detect).toHaveBeenCalledWith(expect.anything(), 1234);
    expect(poseHandler).toHaveBeenCalledWith(pose);
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp", active: true }));
    expect(tracker.getState()).toMatchObject({ status: "running", lastFrameTimestamp: 1236 });
  });

  it("does not emit active true for a one-frame bothHandsUp detection", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([createBothHandsUpPose(), createHandsDownPose(), createHandsDownPose()]),
      config: {
        gestures: {
          enabled: true,
          names: ["bothHandsUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);
    raf.flushFrame(3);

    expect(gestureHandler).not.toHaveBeenCalledWith(expect.objectContaining({ name: "bothHandsUp", active: true }));
  });

  it("emits raw gesture debug results when stability filtering suppresses gesture events", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([createCloseUpBothHandsUpPose()]),
      config: {
        gestures: {
          enabled: true,
          names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();
    const debugHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    tracker.on("gestureDebug", debugHandler);
    await tracker.start();
    raf.flushFrame(1);

    expect(gestureHandler).not.toHaveBeenCalled();
    expect(debugHandler).toHaveBeenCalledTimes(4);
    expect(debugHandler.mock.calls.map(([event]) => event.gesture.name)).toEqual([
      "handUp",
      "leftHandUp",
      "rightHandUp",
      "bothHandsUp",
    ]);
    expect(debugHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        gesture: expect.objectContaining({
          name: "leftHandUp",
          active: true,
          metadata: expect.objectContaining({
            reason: "active",
            orientation: "unknown",
            wristY: 0.2,
            shoulderY: 0.4,
            requiredVisibility: expect.objectContaining({
              leftWrist: 1,
              leftShoulder: 1,
            }),
          }),
        }),
        passedMinConfidence: true,
        stabilityEmitted: false,
        minConfidence: 0,
      }),
    );
  });

  it("emits active true after three stable leftHandUp frames", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([createLeftHandUpPose(), createLeftHandUpPose(), createLeftHandUpPose()]),
      config: {
        gestures: {
          enabled: true,
          names: ["leftHandUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);
    raf.flushFrame(3);

    expect(gestureHandler).toHaveBeenCalledTimes(1);
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp", active: true }));
  });

  it("keeps stable gesture event behavior unchanged while reporting debug emission status", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([createLeftHandUpPose(), createLeftHandUpPose(), createLeftHandUpPose()]),
      config: {
        gestures: {
          enabled: true,
          names: ["leftHandUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();
    const debugHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    tracker.on("gestureDebug", debugHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);
    raf.flushFrame(3);

    expect(gestureHandler).toHaveBeenCalledTimes(1);
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp", active: true }));
    expect(debugHandler.mock.calls.map(([event]) => event.stabilityEmitted)).toEqual([false, false, true]);
  });

  it("emits active true for the built-in generic handUp detector", async () => {
    const sideFacingHandUpPose = createPose([
      landmark("leftShoulder", 11, 0.48, 0.4),
      landmark("rightShoulder", 12, 0.52, 0.4),
      landmark("leftHip", 23, 0.49, 0.7),
      landmark("rightHip", 24, 0.51, 0.7),
      landmark("leftWrist", 15, 0.48, 0.2),
    ]);
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([sideFacingHandUpPose, sideFacingHandUpPose, sideFacingHandUpPose]),
      config: {
        gestures: {
          enabled: true,
          names: ["handUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);
    raf.flushFrame(3);

    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "handUp", active: true }));
  });

  it("keeps all hand-up gesture detectors in the MotionTracker registry", async () => {
    const pose = createCloseUpBothHandsUpPose();
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([pose, pose, pose]),
      config: {
        gestures: {
          enabled: true,
          names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);
    raf.flushFrame(3);

    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "handUp", active: true }));
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp", active: true }));
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "rightHandUp", active: true }));
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "bothHandsUp", active: true }));
  });

  it("emits active false after three stable inactive frames following an active gesture", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([
        createLeftHandUpPose(),
        createLeftHandUpPose(),
        createLeftHandUpPose(),
        createHandsDownPose(),
        createHandsDownPose(),
        createHandsDownPose(),
      ]),
      config: {
        gestures: {
          enabled: true,
          names: ["leftHandUp"],
          minConfidence: 0,
        },
      },
    });
    const gestureHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);
    raf.flushFrame(3);
    raf.flushFrame(4);
    raf.flushFrame(5);
    raf.flushFrame(6);

    expect(gestureHandler).toHaveBeenCalledTimes(2);
    expect(gestureHandler).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: "leftHandUp", active: true }));
    expect(gestureHandler).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: "leftHandUp", active: false }));
  });

  it("emits exercise events when exercises are enabled", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([
        createPose(createSquatDownLegs()),
        createPose(createSquatUpLegs()),
      ]),
      config: {
        exercises: {
          enabled: true,
          names: ["squat"],
          minConfidence: 0,
        },
      },
    });
    const exerciseHandler = vi.fn();

    tracker.on("exercise", exerciseHandler);
    await tracker.start();
    raf.flushFrame(1);
    raf.flushFrame(2);

    expect(exerciseHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "squat", stage: "down", reps: 0 }));
    expect(exerciseHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "squat", stage: "up", reps: 1 }));
  });

  it("registers plugins and calls lifecycle, pose, gesture, and exercise callbacks", async () => {
    const pose = createPose([
      landmark("leftShoulder", 11, 0.3, 0.4),
      landmark("leftWrist", 15, 0.3, 0.2),
      ...createSquatDownLegs(),
    ]);
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createLandmarkTrackerMock(pose),
      config: {
        gestures: {
          enabled: true,
          names: ["leftHandUp"],
          minConfidence: 0,
        },
        exercises: {
          enabled: true,
          names: ["squat"],
          minConfidence: 0,
        },
      },
    });
    const plugin: MotionPlugin = {
      name: "observer",
      onStart: vi.fn(),
      onPose: vi.fn(),
      onGesture: vi.fn(),
      onExercise: vi.fn(),
      onStop: vi.fn(),
    };

    tracker.registerPlugin(plugin);
    await tracker.start();
    raf.flushFrame(10);
    raf.flushFrame(11);
    raf.flushFrame(12);
    tracker.stop();

    expect(plugin.onStart).toHaveBeenCalledWith({ timestamp: 100 }, expect.any(Object));
    expect(plugin.onPose).toHaveBeenCalledWith(pose, expect.any(Object));
    expect(plugin.onGesture).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp" }), expect.any(Object));
    expect(plugin.onExercise).toHaveBeenCalledWith(expect.objectContaining({ name: "squat" }), expect.any(Object));
    expect(plugin.onStop).toHaveBeenCalledWith({ timestamp: 101 }, expect.any(Object));
  });

  it("unregisters plugins by name", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createLandmarkTrackerMock(createPose([])),
    });
    const plugin: MotionPlugin = {
      name: "removed-plugin",
      onPose: vi.fn(),
    };

    tracker.registerPlugin(plugin);
    expect(tracker.unregisterPlugin("removed-plugin")).toBe(true);
    await tracker.start();
    raf.flushFrame(10);

    expect(plugin.onPose).not.toHaveBeenCalled();
  });

  it("lets plugins emit safe gesture and exercise events", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createLandmarkTrackerMock(createPose([])),
    });
    const gestureHandler = vi.fn();
    const exerciseHandler = vi.fn();

    tracker.registerPlugin({
      name: "emitter-plugin",
      onPose: (_pose, api) => {
        api.emitGesture({
          name: "pluginGesture",
          active: true,
          confidence: 1,
          timestamp: 10,
        });
        api.emitExercise({
          name: "pluginExercise",
          stage: "active",
          reps: 1,
          confidence: 1,
          timestamp: 10,
        });
      },
    });
    tracker.on("gesture", gestureHandler);
    tracker.on("exercise", exerciseHandler);

    await tracker.start();
    raf.flushFrame(10);

    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "pluginGesture", active: true }));
    expect(exerciseHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "pluginExercise", reps: 1 }));
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

  it("does not call detect on every animation frame when targetFps is 15", async () => {
    const { tracker, landmarkTracker, raf } = createMotionTracker({
      config: {
        performance: {
          targetFps: 15,
        },
      },
    });

    await tracker.start();
    flushFrames(raf, [0, 16, 32, 48, 67]);

    expect(landmarkTracker.detect).toHaveBeenCalledTimes(2);
    expect(tracker.getState()).toMatchObject({
      lastFrameTimestamp: 67,
      lastDetectionTimestamp: 67,
      framesSkipped: 3,
    });
  });

  it("detects more often at targetFps 30 than targetFps 10", async () => {
    const lowPower = createMotionTracker({
      config: {
        performance: {
          targetFps: 10,
        },
      },
    });
    const quality = createMotionTracker({
      config: {
        performance: {
          targetFps: 30,
        },
      },
    });
    const frameTimestamps = [0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170];

    await lowPower.tracker.start();
    await quality.tracker.start();
    flushFrames(lowPower.raf, frameTimestamps);
    flushFrames(quality.raf, frameTimestamps);

    expect(vi.mocked(quality.landmarkTracker.detect).mock.calls.length).toBeGreaterThan(
      vi.mocked(lowPower.landmarkTracker.detect).mock.calls.length,
    );
  });

  it("start and stop remain responsive when detection is throttled", async () => {
    const { tracker, camera, landmarkTracker, raf } = createMotionTracker({
      config: {
        performance: {
          targetFps: 10,
        },
      },
    });

    await tracker.start();
    raf.flushFrame(0);
    raf.flushFrame(16);
    tracker.stop();
    raf.flushFrame(32);

    expect(landmarkTracker.detect).toHaveBeenCalledTimes(1);
    expect(camera.stop).toHaveBeenCalledOnce();
    expect(raf.cancelAnimationFrame).toHaveBeenCalledOnce();
    expect(tracker.getState()).toMatchObject({
      status: "stopped",
      framesSkipped: 0,
      detectionsPerSecond: 0,
    });
  });

  it("keeps gesture stability working when detection is throttled", async () => {
    const { tracker, raf } = createMotionTracker({
      landmarkTracker: createSequentialLandmarkTrackerMock([
        createLeftHandUpPose(),
        createLeftHandUpPose(),
        createLeftHandUpPose(),
      ]),
      config: {
        gestures: {
          enabled: true,
          names: ["leftHandUp"],
          minConfidence: 0,
        },
        performance: {
          targetFps: 10,
        },
      },
    });
    const gestureHandler = vi.fn();

    tracker.on("gesture", gestureHandler);
    await tracker.start();
    flushFrames(raf, [0, 16, 32, 48, 64, 100, 116, 132, 148, 164, 200]);

    expect(gestureHandler).toHaveBeenCalledTimes(1);
    expect(gestureHandler).toHaveBeenCalledWith(expect.objectContaining({ name: "leftHandUp", active: true }));
  });
});

interface CreateMotionTrackerOptions {
  config?: PartialMotionTrackerConfig;
  landmarkTracker?: MotionLandmarkTracker;
}

type PartialMotionTrackerConfig = Partial<Omit<MotionTrackerConfig, "gestures" | "exercises">> & {
  gestures?: Partial<MotionTrackerConfig["gestures"]>;
  exercises?: Partial<MotionTrackerConfig["exercises"]>;
  performance?: Partial<NonNullable<MotionTrackerConfig["performance"]>>;
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
  const { gestures, exercises, performance, ...rest } = overrides;

  return {
    mode: "pose",
    camera: {},
    pose: {
      modelAssetPath: "/pose.task",
      wasmAssetPath: "/wasm",
    },
    gestures: {
      enabled: false,
      ...gestures,
    },
    exercises: {
      enabled: false,
      ...exercises,
    },
    minConfidence: 0,
    smoothing: {
      enabled: false,
    },
    performance: {
      targetFps: 1000,
      ...performance,
    },
    ...rest,
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

function createSequentialLandmarkTrackerMock(poses: Array<PoseResult | null>): MotionLandmarkTracker {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    detect: vi.fn(() => poses.shift() ?? null),
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

function flushFrames(raf: ReturnType<typeof createRafMock>, timestamps: number[]): void {
  for (const timestamp of timestamps) {
    raf.flushFrame(timestamp);
  }
}

function createPose(landmarks: Landmark[]): PoseResult {
  return {
    timestamp: 1234,
    landmarks,
    confidence: 1,
  };
}

function createLeftHandUpPose(): PoseResult {
  return createPose([
    landmark("leftShoulder", 11, 0.3, 0.4),
    landmark("rightShoulder", 12, 0.7, 0.4),
    landmark("leftHip", 23, 0.35, 0.7),
    landmark("rightHip", 24, 0.65, 0.7),
    landmark("leftWrist", 15, 0.3, 0.2),
  ]);
}

function createBothHandsUpPose(): PoseResult {
  return createPose([
    landmark("leftShoulder", 11, 0.3, 0.4),
    landmark("rightShoulder", 12, 0.7, 0.4),
    landmark("leftHip", 23, 0.35, 0.7),
    landmark("rightHip", 24, 0.65, 0.7),
    landmark("leftWrist", 15, 0.3, 0.2),
    landmark("rightWrist", 16, 0.7, 0.2),
  ]);
}

function createCloseUpBothHandsUpPose(): PoseResult {
  return createPose([
    landmark("leftShoulder", 11, 0.3, 0.4),
    landmark("rightShoulder", 12, 0.7, 0.4),
    landmark("leftWrist", 15, 0.3, 0.2),
    landmark("rightWrist", 16, 0.7, 0.2),
  ]);
}

function createHandsDownPose(): PoseResult {
  return createPose([
    landmark("leftShoulder", 11, 0.3, 0.4),
    landmark("rightShoulder", 12, 0.7, 0.4),
    landmark("leftHip", 23, 0.35, 0.7),
    landmark("rightHip", 24, 0.65, 0.7),
    landmark("leftWrist", 15, 0.3, 0.6),
    landmark("rightWrist", 16, 0.7, 0.6),
  ]);
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

function createSquatDownLegs(): Landmark[] {
  return [
    landmark("leftHip", 23, 0, 0),
    landmark("leftKnee", 25, 0, 1),
    landmark("leftAnkle", 27, 1, 1),
    landmark("rightHip", 24, 1, 0),
    landmark("rightKnee", 26, 1, 1),
    landmark("rightAnkle", 28, 2, 1),
  ];
}

function createSquatUpLegs(): Landmark[] {
  return [
    landmark("leftHip", 23, 0, 0),
    landmark("leftKnee", 25, 0, 1),
    landmark("leftAnkle", 27, 0, 2),
    landmark("rightHip", 24, 1, 0),
    landmark("rightKnee", 26, 1, 1),
    landmark("rightAnkle", 28, 1, 2),
  ];
}
