import type { CameraSource } from "../camera";
import { CameraManager } from "../camera";
import {
  detectArmsOpen,
  detectBothHandsUp,
  detectLeftHandUp,
  detectRightHandUp,
  detectStanding,
} from "../detectors";
import { EventEmitter } from "../events";
import { TrackerProvider, type MotionLandmarkTracker } from "../trackers";
import type { GestureResult, MotionTrackerConfig, MotionTrackerEventMap, PoseResult, TrackerErrorEvent } from "../types";
import { getTimestamp } from "../utils";
import { resolveMotionTrackerConfig, type ResolvedMotionTrackerConfig } from "./TrackerConfig";
import { createInitialTrackerState, type MotionTrackerState } from "./TrackerState";

type GestureDetector = (pose: PoseResult) => GestureResult;
type RequestAnimationFrame = (callback: FrameRequestCallback) => number;
type CancelAnimationFrame = (handle: number) => void;

export interface MotionTrackerDependencies {
  camera?: CameraSource;
  landmarkTracker?: MotionLandmarkTracker;
  requestAnimationFrame?: RequestAnimationFrame;
  cancelAnimationFrame?: CancelAnimationFrame;
  now?: () => number;
}

const GESTURE_DETECTORS: Record<string, GestureDetector> = {
  leftHandUp: detectLeftHandUp,
  rightHandUp: detectRightHandUp,
  bothHandsUp: detectBothHandsUp,
  armsOpen: detectArmsOpen,
  standing: detectStanding,
};

export class MotionTracker {
  private readonly config: ResolvedMotionTrackerConfig;
  private readonly events = new EventEmitter<MotionTrackerEventMap>();
  private readonly camera: CameraSource;
  private readonly landmarkTracker: MotionLandmarkTracker;
  private readonly requestFrame: RequestAnimationFrame;
  private readonly cancelFrame: CancelAnimationFrame;
  private readonly now: () => number;
  private state = createInitialTrackerState();
  private animationFrameId?: number;
  private videoElement?: HTMLVideoElement;

  constructor(config: MotionTrackerConfig, dependencies: MotionTrackerDependencies = {}) {
    this.config = resolveMotionTrackerConfig(config);
    this.camera = dependencies.camera ?? new CameraManager({ camera: this.config.camera });
    this.landmarkTracker =
      dependencies.landmarkTracker ??
      TrackerProvider.create({
        mode: "pose",
        pose: this.config.pose,
      });
    this.requestFrame = dependencies.requestAnimationFrame ?? getRequestAnimationFrame();
    this.cancelFrame = dependencies.cancelAnimationFrame ?? getCancelAnimationFrame();
    this.now = dependencies.now ?? getTimestamp;
  }

  async start(): Promise<void> {
    if (this.state.status === "running" || this.state.status === "starting") {
      return;
    }

    this.state = {
      status: "starting",
      startedAt: this.now(),
    };

    try {
      await this.landmarkTracker.initialize();
      this.videoElement = await this.camera.start();
      this.state = {
        ...this.state,
        status: "running",
      };
      this.events.emit("started", { timestamp: this.state.startedAt ?? this.now() });
      this.scheduleNextFrame();
    } catch (error) {
      this.handleError(error);
      this.camera.stop();
      this.landmarkTracker.dispose();
      throw error;
    }
  }

  stop(): void {
    if (this.animationFrameId !== undefined) {
      this.cancelFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    this.camera.stop();
    this.landmarkTracker.dispose();

    const stoppedAt = this.now();
    this.state = {
      ...this.state,
      status: "stopped",
      stoppedAt,
    };
    this.events.emit("stopped", { timestamp: stoppedAt });
  }

  on<TEventName extends keyof MotionTrackerEventMap>(
    eventName: TEventName,
    handler: (payload: MotionTrackerEventMap[TEventName]) => void,
  ): this {
    this.events.on(eventName, handler);

    return this;
  }

  off<TEventName extends keyof MotionTrackerEventMap>(
    eventName: TEventName,
    handler: (payload: MotionTrackerEventMap[TEventName]) => void,
  ): this {
    this.events.off(eventName, handler);

    return this;
  }

  getState(): MotionTrackerState {
    return { ...this.state };
  }

  private scheduleNextFrame(): void {
    this.animationFrameId = this.requestFrame((timestamp) => {
      this.processFrame(timestamp);
    });
  }

  private processFrame(timestamp: number): void {
    if (this.state.status !== "running" || !this.videoElement) {
      return;
    }

    try {
      const pose = this.landmarkTracker.detect(this.videoElement, timestamp);
      this.state = {
        ...this.state,
        lastFrameTimestamp: timestamp,
      };

      if (pose && pose.confidence >= this.config.minConfidence) {
        this.events.emit("pose", pose);
        this.emitGestures(pose);
      }

      if (this.state.status === "running") {
        this.scheduleNextFrame();
      }
    } catch (error) {
      this.handleError(error);
      this.stop();
    }
  }

  private emitGestures(pose: PoseResult): void {
    if (!this.config.gestures.enabled) {
      return;
    }

    const detectorNames = this.config.gestures.names ?? Object.keys(GESTURE_DETECTORS);

    for (const detectorName of detectorNames) {
      const detector = GESTURE_DETECTORS[detectorName];

      if (!detector) {
        continue;
      }

      const gesture = detector(pose);

      if (gesture.confidence >= (this.config.gestures.minConfidence ?? 0)) {
        this.events.emit("gesture", gesture);
      }
    }
  }

  private handleError(error: unknown): void {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const payload: TrackerErrorEvent = {
      message: normalizedError.message,
      cause: error,
    };

    this.state = {
      ...this.state,
      status: "error",
      error: normalizedError,
    };
    this.events.emit("error", payload);
  }
}

function getRequestAnimationFrame(): RequestAnimationFrame {
  if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
    throw new Error("requestAnimationFrame is unavailable. MotionTracker must run in a browser context.");
  }

  return (callback) => window.requestAnimationFrame(callback);
}

function getCancelAnimationFrame(): CancelAnimationFrame {
  if (typeof window === "undefined" || typeof window.cancelAnimationFrame !== "function") {
    throw new Error("cancelAnimationFrame is unavailable. MotionTracker must run in a browser context.");
  }

  return (handle) => window.cancelAnimationFrame(handle);
}