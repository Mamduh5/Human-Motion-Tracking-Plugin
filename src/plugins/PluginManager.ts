import type { ExerciseResult, GestureResult, PoseResult, TrackerLifecycleEvent } from "../types";
import type { MotionPlugin, MotionPluginApi } from "./MotionPlugin";

export class PluginManager {
  private readonly plugins = new Map<string, MotionPlugin>();

  constructor(private readonly api: MotionPluginApi) {}

  register(plugin: MotionPlugin): void {
    if (!plugin.name.trim()) {
      throw new Error("MotionPlugin.name is required.");
    }

    if (this.plugins.has(plugin.name)) {
      throw new Error(`MotionPlugin "${plugin.name}" is already registered.`);
    }

    this.plugins.set(plugin.name, plugin);
  }

  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  has(name: string): boolean {
    return this.plugins.has(name);
  }

  getPlugins(): MotionPlugin[] {
    return [...this.plugins.values()];
  }

  notifyStart(event: TrackerLifecycleEvent): void {
    this.callPlugins((plugin) => plugin.onStart?.(event, this.api));
  }

  notifyStop(event: TrackerLifecycleEvent): void {
    this.callPlugins((plugin) => plugin.onStop?.(event, this.api));
  }

  notifyPose(pose: PoseResult): void {
    this.callPlugins((plugin) => plugin.onPose?.(pose, this.api));
  }

  notifyGesture(gesture: GestureResult): void {
    this.callPlugins((plugin) => plugin.onGesture?.(gesture, this.api));
  }

  notifyExercise(exercise: ExerciseResult): void {
    this.callPlugins((plugin) => plugin.onExercise?.(exercise, this.api));
  }

  private callPlugins(callback: (plugin: MotionPlugin) => void): void {
    for (const plugin of this.plugins.values()) {
      callback(plugin);
    }
  }
}
