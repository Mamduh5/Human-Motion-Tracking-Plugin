import type { MotionTracker } from "../core";
import type { MotionPlugin } from "./MotionPlugin";

export function registerPlugin(tracker: MotionTracker, plugin: MotionPlugin): MotionTracker {
  return tracker.registerPlugin(plugin);
}
