# Human Motion Tracking Plugin

A reusable TypeScript SDK for browser-based human pose tracking. It wraps browser camera access, MediaPipe Pose Landmarker initialization, normalized pose landmarks, gesture detection, exercise analysis, a plugin API, and an optional React hook.

Use it to build camera-powered motion features such as:

- Hand-up, arms-open, and standing gesture detection.
- Squat rep and stage analysis.
- Custom motion plugins that react to pose, gesture, and exercise events.
- Vanilla browser or React applications that need live pose tracking.

## Install

```bash
npm install human-motion-tracking-plugin
```

For local development from this repository:

```bash
npm install
npm run build
```

The SDK is browser-first. Camera tracking requires `navigator.mediaDevices.getUserMedia`, `requestAnimationFrame`, a secure context (`https://` or `localhost`), and a user permission grant.

## Basic Usage

```ts
import { MotionTracker, type MotionTrackerConfig } from "human-motion-tracking-plugin";

const config: MotionTrackerConfig = {
  mode: "pose",
  camera: {
    facingMode: "user",
    width: 1280,
    height: 720,
  },
  pose: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    wasmAssetPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  },
  gestures: {
    enabled: true,
    names: ["leftHandUp", "rightHandUp", "bothHandsUp"],
    minConfidence: 0.5,
  },
  exercises: {
    enabled: true,
    names: ["squat"],
    minConfidence: 0.5,
  },
  minConfidence: 0.5,
  smoothing: {
    enabled: false,
  },
};

const tracker = new MotionTracker(config);

tracker.on("pose", (pose) => {
  console.log("landmarks", pose.landmarks);
});

tracker.on("gesture", (gesture) => {
  if (gesture.active) {
    console.log("gesture", gesture.name);
  }
});

tracker.on("exercise", (exercise) => {
  console.log(exercise.name, exercise.stage, exercise.reps);
});

await tracker.start();
```

Call `tracker.stop()` when the view is closed or tracking is no longer needed.

## React Adapter

```tsx
import type { MotionTrackerConfig } from "human-motion-tracking-plugin";
import { useMotionTracker } from "human-motion-tracking-plugin/react";

export function TrackerPanel({ config }: { config: MotionTrackerConfig }) {
  const { start, stop, state, latestGestures, latestExercises, error } = useMotionTracker(config);

  return (
    <section>
      <button onClick={() => void start()} disabled={state.status === "running"}>
        Start
      </button>
      <button onClick={stop}>Stop</button>
      <p>Status: {state.status}</p>
      <p>Gestures: {latestGestures.map((gesture) => gesture.name).join(", ") || "None"}</p>
      <p>Squat reps: {latestExercises.find((exercise) => exercise.name === "squat")?.reps ?? 0}</p>
      {error ? <p>{error.message}</p> : null}
    </section>
  );
}
```

React is an optional peer dependency. Non-React consumers can import from the package root without loading the adapter.

## Vanilla Web Example

Run the camera demo from the repository root:

```bash
npm run dev:vanilla
```

Open the Vite URL, allow camera access, then use the Start and Stop buttons. The example displays the camera preview, draws pose landmarks on a canvas overlay, and shows active `leftHandUp`, `rightHandUp`, and `bothHandsUp` gestures.

## Documentation

- [Usage guide](docs/usage.md): setup, MotionTracker examples, hand-up gestures, squats, React, and the vanilla example.
- [Architecture](docs/architecture.md): SDK layers, frame flow, browser requirements, and MediaPipe assets.
- [Plugin API](docs/plugin-api.md): plugin lifecycle, registration, emitted events, and safe extension points.

## Scripts

- `npm run build` compiles the TypeScript library into `dist/`.
- `npm test` runs the Vitest test suite.
- `npm run dev` starts a Vite dev server rooted at `examples/`.
- `npm run dev:vanilla` starts the vanilla browser example.
- `npm run build:vanilla` builds the vanilla browser example.
