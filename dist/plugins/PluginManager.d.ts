import type { ExerciseResult, GestureResult, PoseResult, TrackerLifecycleEvent } from "../types";
import type { MotionPlugin, MotionPluginApi } from "./MotionPlugin";
export declare class PluginManager {
    private readonly api;
    private readonly plugins;
    constructor(api: MotionPluginApi);
    register(plugin: MotionPlugin): void;
    unregister(name: string): boolean;
    has(name: string): boolean;
    getPlugins(): MotionPlugin[];
    notifyStart(event: TrackerLifecycleEvent): void;
    notifyStop(event: TrackerLifecycleEvent): void;
    notifyPose(pose: PoseResult): void;
    notifyGesture(gesture: GestureResult): void;
    notifyExercise(exercise: ExerciseResult): void;
    private callPlugins;
}
//# sourceMappingURL=PluginManager.d.ts.map