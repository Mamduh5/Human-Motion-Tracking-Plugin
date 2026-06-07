import { CameraManager } from "../camera";
import { SquatAnalyzer, detectArmsOpen, detectBothHandsUp, detectLeftHandUp, detectRightHandUp, detectStanding, } from "../detectors";
import { EventEmitter } from "../events";
import { PluginManager } from "../plugins";
import { TrackerProvider } from "../trackers";
import { getTimestamp } from "../utils";
import { resolveMotionTrackerConfig } from "./TrackerConfig";
import { createInitialTrackerState } from "./TrackerState";
const GESTURE_DETECTORS = {
    leftHandUp: detectLeftHandUp,
    rightHandUp: detectRightHandUp,
    bothHandsUp: detectBothHandsUp,
    armsOpen: detectArmsOpen,
    standing: detectStanding,
};
const EXERCISE_ANALYZERS = {
    squat: () => new SquatAnalyzer(),
};
export class MotionTracker {
    constructor(config, dependencies = {}) {
        this.events = new EventEmitter();
        this.exerciseAnalyzers = new Map();
        this.state = createInitialTrackerState();
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
        this.pluginManager = new PluginManager(this.createPluginApi());
    }
    async start() {
        if (this.state.status === "running" || this.state.status === "starting") {
            return;
        }
        this.state = {
            status: "starting",
            startedAt: this.now(),
        };
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
        }
        catch (error) {
            this.handleError(error);
            this.camera.stop();
            this.landmarkTracker.dispose();
            throw error;
        }
    }
    stop() {
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
        const stoppedEvent = { timestamp: stoppedAt };
        this.events.emit("stopped", stoppedEvent);
        this.pluginManager.notifyStop(stoppedEvent);
    }
    on(eventName, handler) {
        this.events.on(eventName, handler);
        return this;
    }
    off(eventName, handler) {
        this.events.off(eventName, handler);
        return this;
    }
    getState() {
        return { ...this.state };
    }
    registerPlugin(plugin) {
        this.pluginManager.register(plugin);
        return this;
    }
    unregisterPlugin(name) {
        return this.pluginManager.unregister(name);
    }
    scheduleNextFrame() {
        this.animationFrameId = this.requestFrame((timestamp) => {
            this.processFrame(timestamp);
        });
    }
    processFrame(timestamp) {
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
                this.pluginManager.notifyPose(pose);
                this.emitGestures(pose);
                this.emitExercises(pose);
            }
            if (this.state.status === "running") {
                this.scheduleNextFrame();
            }
        }
        catch (error) {
            this.handleError(error);
            this.stop();
        }
    }
    emitGestures(pose) {
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
                this.emitGestureEvent(gesture);
            }
        }
    }
    emitExercises(pose) {
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
    getExerciseAnalyzer(name) {
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
    resetExerciseAnalyzers() {
        for (const analyzer of this.exerciseAnalyzers.values()) {
            analyzer.reset?.();
        }
    }
    emitGestureEvent(gesture) {
        this.events.emit("gesture", gesture);
        this.pluginManager.notifyGesture(gesture);
    }
    emitExerciseEvent(exercise) {
        this.events.emit("exercise", exercise);
        this.pluginManager.notifyExercise(exercise);
    }
    createPluginApi() {
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
    handleError(error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        const payload = {
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
function getRequestAnimationFrame() {
    if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        throw new Error("requestAnimationFrame is unavailable. MotionTracker must run in a browser context.");
    }
    return (callback) => window.requestAnimationFrame(callback);
}
function getCancelAnimationFrame() {
    if (typeof window === "undefined" || typeof window.cancelAnimationFrame !== "function") {
        throw new Error("cancelAnimationFrame is unavailable. MotionTracker must run in a browser context.");
    }
    return (handle) => window.cancelAnimationFrame(handle);
}
//# sourceMappingURL=MotionTracker.js.map