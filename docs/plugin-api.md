# Plugin API

Plugins extend `MotionTracker` with custom motion logic. They can observe tracker lifecycle events, pose events, built-in gesture events, and exercise events. They can also emit derived gesture or exercise results through a restricted API.

Plugins are useful for:

- Domain-specific gestures.
- Rep counting or form checks not included in the SDK.
- Analytics or telemetry derived from pose events.
- Integrations that should stay separate from application UI code.

## MotionPlugin

```ts
import type {
  ExerciseResult,
  GestureResult,
  MotionPlugin,
  MotionPluginApi,
  PoseResult,
  TrackerLifecycleEvent,
} from "human-motion-tracking-plugin";

interface MotionPlugin {
  name: string;
  onStart?(event: TrackerLifecycleEvent, api: MotionPluginApi): void;
  onStop?(event: TrackerLifecycleEvent, api: MotionPluginApi): void;
  onPose?(pose: PoseResult, api: MotionPluginApi): void;
  onGesture?(gesture: GestureResult, api: MotionPluginApi): void;
  onExercise?(exercise: ExerciseResult, api: MotionPluginApi): void;
}
```

`name` is required, must not be blank, and must be unique per tracker. Registering a duplicate name throws an error.

## MotionPluginApi

Plugins receive a safe runtime API:

```ts
interface MotionPluginApi {
  emitGesture(gesture: GestureResult): void;
  emitExercise(exercise: ExerciseResult): void;
  getState(): MotionTrackerState;
}
```

The API intentionally does not expose camera controls, MediaPipe internals, or the frame loop.

## Registering Plugins

Register directly on a tracker:

```ts
import { MotionTracker, type MotionPlugin } from "human-motion-tracking-plugin";

const plugin: MotionPlugin = {
  name: "pose-logger",
  onPose(pose) {
    console.log(pose.timestamp, pose.confidence);
  },
};

const tracker = new MotionTracker(config);

tracker.registerPlugin(plugin);
```

Or use the helper:

```ts
import { registerPlugin } from "human-motion-tracking-plugin";

registerPlugin(tracker, plugin);
```

Unregister by name:

```ts
tracker.unregisterPlugin("pose-logger");
```

## Emitting a Custom Gesture

```ts
import type { MotionPlugin } from "human-motion-tracking-plugin";

export const highConfidencePosePlugin: MotionPlugin = {
  name: "high-confidence-pose",
  onPose(pose, api) {
    api.emitGesture({
      name: "highConfidencePose",
      active: pose.confidence >= 0.9,
      confidence: pose.confidence,
      timestamp: pose.timestamp,
      metadata: {
        landmarkCount: pose.landmarks.length,
      },
    });
  },
};
```

Consumers receive plugin-emitted gestures through the normal `gesture` event:

```ts
tracker.on("gesture", (gesture) => {
  if (gesture.name === "highConfidencePose" && gesture.active) {
    console.log("high-confidence pose detected");
  }
});
```

## Emitting a Custom Exercise

```ts
import type { MotionPlugin } from "human-motion-tracking-plugin";

export function createHoldCounterPlugin(): MotionPlugin {
  let frames = 0;

  return {
    name: "hold-counter",
    onPose(pose, api) {
      if (pose.confidence >= 0.75) {
        frames += 1;
      } else {
        frames = 0;
      }

      api.emitExercise({
        name: "stableHold",
        stage: frames > 30 ? "held" : "building",
        reps: frames > 30 ? 1 : 0,
        confidence: pose.confidence,
        timestamp: pose.timestamp,
        metadata: {
          frames,
        },
      });
    },
    onStop() {
      frames = 0;
    },
  };
}
```

Consumers receive plugin-emitted exercises through the normal `exercise` event.

## Observing Built-In Events

Plugins can react to built-in detectors and analyzers:

```ts
const alertPlugin: MotionPlugin = {
  name: "hand-alert",
  onGesture(gesture, api) {
    if (gesture.name !== "bothHandsUp" || !gesture.active) {
      return;
    }

    api.emitGesture({
      name: "attentionSignal",
      active: true,
      confidence: gesture.confidence,
      timestamp: gesture.timestamp,
      metadata: {
        source: gesture.name,
      },
    });
  },
};
```

The core processing order for a valid frame is:

1. `pose`
2. built-in `gesture` events, if enabled
3. built-in `exercise` events, if enabled

For each emitted event, tracker event handlers are called and then registered plugins receive the matching callback.

Plugin-emitted events are immediately emitted through the same tracker event system and dispatched to registered plugins.

## Result Shapes

Custom gesture results should match:

```ts
interface GestureResult {
  name: string;
  active: boolean;
  confidence: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

Custom exercise results should match:

```ts
interface ExerciseResult {
  name: string;
  stage: string;
  reps: number;
  confidence: number;
  timestamp: number;
  warnings?: string[];
  metadata?: Record<string, unknown>;
}
```

Use stable `name` values so application code can identify plugin events reliably.

## Practical Guidance

Keep plugin callbacks lightweight because they run in the frame processing path. Store only the history you need, reset internal counters in `onStart` or `onStop`, and prefer emitting one clear result per frame over many noisy events.

Plugins should handle missing or low-confidence landmarks gracefully. Use `pose.confidence`, landmark `visibility`, and named landmark utilities from the SDK when building detectors:

```ts
import { getLandmarkByName, isLandmarkVisible } from "human-motion-tracking-plugin";

const leftWrist = getLandmarkByName(pose.landmarks, "leftWrist");

if (!leftWrist || !isLandmarkVisible(leftWrist, 0.5)) {
  return;
}
```

## Complete Registration Example

```ts
import { MotionTracker, type MotionPlugin } from "human-motion-tracking-plugin";

const plugin: MotionPlugin = {
  name: "left-wrist-visible",
  onPose(pose, api) {
    const leftWrist = pose.landmarks.find((landmark) => landmark.name === "leftWrist");
    const active = Boolean(leftWrist && (leftWrist.visibility ?? 0) >= 0.5);

    api.emitGesture({
      name: "leftWristVisible",
      active,
      confidence: leftWrist?.visibility ?? 0,
      timestamp: pose.timestamp,
    });
  },
};

const tracker = new MotionTracker(config);

tracker.registerPlugin(plugin);

tracker.on("gesture", (gesture) => {
  if (gesture.name === "leftWristVisible") {
    console.log(gesture.active);
  }
});

await tracker.start();
```
