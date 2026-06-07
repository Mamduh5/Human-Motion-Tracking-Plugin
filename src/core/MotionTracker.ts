import type { CameraSource } from "../camera";
import { CameraManager } from "../camera";
import {
  SquatAnalyzer,
  detectArmsOpen,
  detectBothHandsUp,
  detectHandUp,
  detectLeftHandUp,
  detectRightHandUp,
  detectStanding,
} from "../detectors";
import { EventEmitter } from "../events";
import { PluginManager, type MotionPlugin, type MotionPluginApi } from "../plugins";
import { TrackerProvider, type MotionLandmarkTracker } from "../trackers";
import type {
  ExerciseResult,
  GestureDebugEvent,
  GestureResult,
  MotionTrackerConfig,
  MotionTrackerEventMap,
  PoseResult,
  TrackerErrorEvent,
} from "../types";
import { getTimestamp } from "../utils";
import { GestureStabilityFilter } from "./GestureStabilityFilter";
import { resolveMotionTrackerConfig, type ResolvedMotionTrackerConfig } from "./TrackerConfig";
import { createInitialTrackerState, type MotionTrackerState } from "./TrackerState";

type GestureDetector = (pose: PoseResult) => GestureResult;
type ExerciseAnalyzer = {
  analyze(pose: PoseResult): ExerciseResult;
  reset?(): void;
};
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
  handUp: detectHandUp,
  leftHandUp: detectLeftHandUp,
  rightHandUp: detectRightHandUp,
  bothHandsUp: detectBothHandsUp,
  armsOpen: detectArmsOpen,
  standing: detectStanding,
};

const EXERCISE_ANALYZERS: Record<string, () => ExerciseAnalyzer> = {
  squat: () => new SquatAnalyzer(),
};

export class MotionTracker {
  private readonly config: ResolvedMotionTrackerConfig;
  private readonly events = new EventEmitter<MotionTrackerEventMap>();
  private readonly camera: CameraSource;
  private readonly landmarkTracker: MotionLandmarkTracker;
  private readonly requestFrame: RequestAnimationFrame;
  private readonly cancelFrame: CancelAnimationFrame;
  private readonly now: () => number;
  private readonly detectionIntervalMs: number;
  private readonly pluginManager: PluginManager;
  private readonly gestureStabilityFilter: GestureStabilityFilter;
  private readonly exerciseAnalyzers = new Map<string, ExerciseAnalyzer>();
  private state = createInitialTrackerState();
  private animationFrameId?: number;
  private videoElement?: HTMLVideoElement;
  private lastDetectionTimestamp?: number;
  private averageDetectionMs?: number;
  private framesSkipped = 0;
  private detectionCount = 0;
  private detectionRateWindowStartedAt?: number;
  private detectionsPerSecond = 0;

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
    this.detectionIntervalMs = 1000 / this.config.performance.targetFps;
    this.gestureStabilityFilter = new GestureStabilityFilter({
      activeFrameThreshold: this.config.gestures.stability.activeFrames,
      inactiveFrameThreshold: this.config.gestures.stability.inactiveFrames,
    });
    this.pluginManager = new PluginManager(this.createPluginApi());
  }

  async start(): Promise<void> {
    if (this.state.status === "running" || this.state.status === "starting") {
      return;
    }

    this.resetPerformanceCounters();
    this.state = {
      status: "starting",
      startedAt: this.now(),
      ...this.getPerformanceState(),
    };
    this.gestureStabilityFilter.reset();
    this.resetExerciseAnalyzers();

    try {
      await this.landmarkTracker.initialize();
      this.videoElement = await this.camera.start();
      this.state = {
        ...this.state,
        status: "running",
      };
      const startedEvent = { timestamp: this.state.startedAt ?? this.now() };
      this.events.emit("started", startedEvent);
      this.pluginManager.notifyStart(startedEvent);
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

    const stoppedAt = this.now();
    this.camera.stop();
    this.landmarkTracker.dispose();
    this.resetPerformanceCounters();
    this.state = {
      ...this.state,
      status: "stopped",
      stoppedAt,
      ...this.getPerformanceState(),
    };
    const stoppedEvent = { timestamp: stoppedAt };
    this.events.emit("stopped", stoppedEvent);
    this.pluginManager.notifyStop(stoppedEvent);
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

  registerPlugin(plugin: MotionPlugin): this {
    this.pluginManager.register(plugin);

    return this;
  }

  unregisterPlugin(name: string): boolean {
    return this.pluginManager.unregister(name);
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

    this.state = {
      ...this.state,
      lastFrameTimestamp: timestamp,
    };

    if (!this.shouldRunDetection(timestamp)) {
      this.framesSkipped += 1;
      this.state = {
        ...this.state,
        ...this.getPerformanceState(),
      };
      this.scheduleNextFrameIfRunning();
      return;
    }

    try {
      const detectionStartedAt = getTimestamp();
      const pose = this.landmarkTracker.detect(this.videoElement, timestamp);
      this.updateDetectionPerformance(timestamp, Math.max(0, getTimestamp() - detectionStartedAt));

      if (pose && pose.confidence >= this.config.minConfidence) {
        this.events.emit("pose", pose);
        this.pluginManager.notifyPose(pose);
        this.emitGestures(pose);
        this.emitExercises(pose);
      }

      this.scheduleNextFrameIfRunning();
    } catch (error) {
      this.handleError(error);
      this.stop();
    }
  }

  private shouldRunDetection(timestamp: number): boolean {
    return this.lastDetectionTimestamp === undefined || timestamp - this.lastDetectionTimestamp >= this.detectionIntervalMs;
  }

  private updateDetectionPerformance(timestamp: number, detectionMs: number): void {
    this.lastDetectionTimestamp = timestamp;
    this.averageDetectionMs =
      this.averageDetectionMs === undefined ? detectionMs : this.averageDetectionMs * 0.8 + detectionMs * 0.2;
    this.detectionCount += 1;

    if (this.detectionRateWindowStartedAt === undefined) {
      this.detectionRateWindowStartedAt = timestamp;
      this.detectionsPerSecond = this.detectionCount;
    } else {
      const elapsedSeconds = (timestamp - this.detectionRateWindowStartedAt) / 1000;
      this.detectionsPerSecond = elapsedSeconds > 0 ? this.detectionCount / elapsedSeconds : this.detectionCount;
    }

    this.state = {
      ...this.state,
      ...this.getPerformanceState(),
    };
  }

  private resetPerformanceCounters(): void {
    this.lastDetectionTimestamp = undefined;
    this.averageDetectionMs = undefined;
    this.framesSkipped = 0;
    this.detectionCount = 0;
    this.detectionRateWindowStartedAt = undefined;
    this.detectionsPerSecond = 0;
  }

  private getPerformanceState(): Pick<
    MotionTrackerState,
    "lastDetectionTimestamp" | "averageDetectionMs" | "framesSkipped" | "detectionsPerSecond"
  > {
    return {
      lastDetectionTimestamp: this.lastDetectionTimestamp,
      averageDetectionMs: this.averageDetectionMs,
      framesSkipped: this.framesSkipped,
      detectionsPerSecond: this.detectionsPerSecond,
    };
  }

  private scheduleNextFrameIfRunning(): void {
    if (this.state.status === "running") {
      this.scheduleNextFrame();
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
      const minConfidence = this.config.gestures.minConfidence ?? 0;
      const passedMinConfidence = gesture.confidence >= minConfidence;
      let stableGesture: GestureResult | undefined;

      if (passedMinConfidence) {
        stableGesture = this.config.gestures.stability.enabled ? this.gestureStabilityFilter.filter(gesture) ?? undefined : gesture;

        if (stableGesture) {
          this.emitGestureEvent(stableGesture);
        }
      }

      this.emitGestureDebugEvent({
        gesture,
        passedMinConfidence,
        stabilityEmitted: Boolean(stableGesture),
        stableGesture,
        minConfidence,
      });
    }
  }

  private emitExercises(pose: PoseResult): void {
    if (!this.config.exercises.enabled) {
      return;
    }

    const analyzerNames = this.config.exercises.names ?? Object.keys(EXERCISE_ANALYZERS);

    for (const analyzerName of analyzerNames) {
      const analyzer = this.getExerciseAnalyzer(analyzerName);

      if (!analyzer) {
        continue;
      }

      const exercise = analyzer.analyze(pose);

      if (exercise.confidence >= (this.config.exercises.minConfidence ?? 0)) {
        this.emitExerciseEvent(exercise);
      }
    }
  }

  private getExerciseAnalyzer(name: string): ExerciseAnalyzer | undefined {
    const existingAnalyzer = this.exerciseAnalyzers.get(name);

    if (existingAnalyzer) {
      return existingAnalyzer;
    }

    const createAnalyzer = EXERCISE_ANALYZERS[name];

    if (!createAnalyzer) {
      return undefined;
    }

    const analyzer = createAnalyzer();
    this.exerciseAnalyzers.set(name, analyzer);

    return analyzer;
  }

  private resetExerciseAnalyzers(): void {
    for (const analyzer of this.exerciseAnalyzers.values()) {
      analyzer.reset?.();
    }
  }

  private emitGestureEvent(gesture: GestureResult): void {
    this.events.emit("gesture", gesture);
    this.pluginManager.notifyGesture(gesture);
  }

  private emitGestureDebugEvent(debugEvent: GestureDebugEvent): void {
    this.events.emit("gestureDebug", debugEvent);
  }

  private emitExerciseEvent(exercise: ExerciseResult): void {
    this.events.emit("exercise", exercise);
    this.pluginManager.notifyExercise(exercise);
  }

  private createPluginApi(): MotionPluginApi {
    return {
      emitGesture: (gesture) => {
        this.emitGestureEvent(gesture);
      },
      emitExercise: (exercise) => {
        this.emitExerciseEvent(exercise);
      },
      getState: () => this.getState(),
    };
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
