import type { ExerciseResult, GestureResult, PoseResult, TrackerLifecycleEvent } from "../types";
import type { MotionTrackerState } from "../core";

/**
 * Safe runtime API passed to motion plugins.
 *
 * Plugins can publish derived gesture and exercise events, but they cannot
 * control the camera, tracker loop, or raw MediaPipe internals.
 */
export interface MotionPluginApi {
  emitGesture(gesture: GestureResult): void;
  emitExercise(exercise: ExerciseResult): void;
  getState(): MotionTrackerState;
}

/**
 * Extension point for custom motion logic.
 *
 * Implement this interface to observe tracker lifecycle, pose, gesture, and
 * exercise events. Plugins are registered by name and should keep their own
 * internal state if they need history across frames.
 */
export interface MotionPlugin {
  name: string;
  onStart?(event: TrackerLifecycleEvent, api: MotionPluginApi): void;
  onStop?(event: TrackerLifecycleEvent, api: MotionPluginApi): void;
  onPose?(pose: PoseResult, api: MotionPluginApi): void;
  onGesture?(gesture: GestureResult, api: MotionPluginApi): void;
  onExercise?(exercise: ExerciseResult, api: MotionPluginApi): void;
}
