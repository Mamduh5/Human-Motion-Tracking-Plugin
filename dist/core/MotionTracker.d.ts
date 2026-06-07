import type { CameraSource } from "../camera";
import { type MotionPlugin } from "../plugins";
import { type MotionLandmarkTracker } from "../trackers";
import type { MotionTrackerConfig, MotionTrackerEventMap } from "../types";
import { type MotionTrackerState } from "./TrackerState";
type RequestAnimationFrame = (callback: FrameRequestCallback) => number;
type CancelAnimationFrame = (handle: number) => void;
export interface MotionTrackerDependencies {
    camera?: CameraSource;
    landmarkTracker?: MotionLandmarkTracker;
    requestAnimationFrame?: RequestAnimationFrame;
    cancelAnimationFrame?: CancelAnimationFrame;
    now?: () => number;
}
export declare class MotionTracker {
    private readonly config;
    private readonly events;
    private readonly camera;
    private readonly landmarkTracker;
    private readonly requestFrame;
    private readonly cancelFrame;
    private readonly now;
    private readonly pluginManager;
    private readonly exerciseAnalyzers;
    private state;
    private animationFrameId?;
    private videoElement?;
    constructor(config: MotionTrackerConfig, dependencies?: MotionTrackerDependencies);
    start(): Promise<void>;
    stop(): void;
    on<TEventName extends keyof MotionTrackerEventMap>(eventName: TEventName, handler: (payload: MotionTrackerEventMap[TEventName]) => void): this;
    off<TEventName extends keyof MotionTrackerEventMap>(eventName: TEventName, handler: (payload: MotionTrackerEventMap[TEventName]) => void): this;
    getState(): MotionTrackerState;
    registerPlugin(plugin: MotionPlugin): this;
    unregisterPlugin(name: string): boolean;
    private scheduleNextFrame;
    private processFrame;
    private emitGestures;
    private emitExercises;
    private getExerciseAnalyzer;
    private resetExerciseAnalyzers;
    private emitGestureEvent;
    private emitExerciseEvent;
    private createPluginApi;
    private handleError;
}
export {};
//# sourceMappingURL=MotionTracker.d.ts.map