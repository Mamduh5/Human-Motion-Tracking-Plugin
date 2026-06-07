# Human Motion Tracking Plugin

A reusable TypeScript SDK for browser-based human pose tracking. It wraps browser camera access, MediaPipe Pose Landmarker initialization, normalized pose landmarks, gesture detection, exercise analysis, a plugin API, and an optional React hook.

Use it to build camera-powered motion features such as:

- Hand-up, arm-pose, arms-open, and standing gesture detection.
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
    width: 640,
    height: 480,
    frameRate: 10,
  },
  pose: {
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    wasmAssetPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
  },
  gestures: {
    enabled: true,
    names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp", "armsUp", "armsCrossed"],
    minConfidence: 0.5,
    precision: "balanced",
    stability: {
      enabled: true,
      activeFrames: 3,
      inactiveFrames: 3,
    },
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
  performance: {
    profile: "low-power",
    targetFps: 10,
    adaptive: false,
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

## Performance / Low-Power Laptops

On older laptops, prefer a smaller camera stream and lower detection rate:

- Use 640x480 camera constraints.
- Use 10-15 `performance.targetFps`; start with `performance.profile: "low-power"` and `targetFps: 10` on older laptops.
- Avoid enabling pose, hands, and face tracking all at once on weak devices.
- Run `npm run dev:vanilla` manually only when you need the camera demo; it starts a long-running Vite server.
- For close-up gesture debugging, use the vanilla demo's “Show gesture debug” panel. Disable “Use gesture stability” to see whether raw left/right detector results are active before the 3-frame stability filter.

## Gesture Precision

Gesture precision controls detector sensitivity:

- `loose`: more sensitive, useful for weak webcams, close-up framing, or imperfect lighting.
- `balanced`: default SDK behavior.
- `strict`: fewer false positives, useful when camera quality and pose visibility are good.

```ts
const config: MotionTrackerConfig = {
  ...baseConfig,
  gestures: {
    enabled: true,
    names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp"],
    precision: "loose",
    thresholds: {
      handUpYMargin: 0.02,
    },
  },
};
```

## Calibration

Calibration is optional. It samples the existing pose stream for a few seconds while the user stands front-facing with relaxed arms, then estimates user/camera-specific body scale and visibility. The result can improve gesture threshold scaling across close-up webcam views and smaller full-body views, but it does not replace MediaPipe pose accuracy or add MediaPipe hand tracking.

```ts
const tracker = new MotionTracker({
  ...config,
  calibration: {
    enabled: true,
    autoApply: true,
    options: {
      durationMs: 3000,
      minSamples: 8,
      pose: "neutral",
      minVisibility: 0.5,
    },
  },
});

tracker.on("calibrationProgress", (progress) => {
  console.log(progress.sampleCount, progress.quality, progress.warnings);
});

tracker.on("calibrationCompleted", (result) => {
  console.log(result.metrics, result.recommendedThresholds);
});

await tracker.start();
tracker.startCalibration();
```

You can also use the promise API:

```ts
await tracker.start();
const result = await tracker.calibrate({ durationMs: 3000 });
tracker.applyCalibration(result);
```

Saved calibration is useful for repeated browser sessions. Redo calibration when camera distance, lighting, camera angle, or the user changes.

```ts
const result = tracker.getCalibration();

if (result) {
  localStorage.setItem("motionCalibration", JSON.stringify(result));
}
```

The SDK also exports `serializeCalibration`, `parseCalibration`, `saveCalibration`, `loadCalibration`, and `clearCalibration` for safer persistence. `saveCalibration` and `loadCalibration` use `localStorage` only when browser APIs are available, so they are safe to call in tests and non-browser environments.

Calibration thresholds are resolved in this order: gesture precision preset, applied calibration recommendations, then explicit `gestures.thresholds`. User-provided thresholds win so existing app-specific tuning remains stable.

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

Open the Vite URL, allow camera access, then use the Start and Stop buttons. The example displays the camera preview, draws pose landmarks on a canvas overlay, and shows active gestures including `handUp`, `leftHandUp`, `rightHandUp`, `bothHandsUp`, `armsUp`, `armsCrossed`, and `handsOnHips`.
The example defaults to 640x480 at 10 FPS with the low-power performance profile. It also shows detections/sec, average detection time, skipped frames, raw gesture debug, calibration controls, and a “Use gesture stability” checkbox.

Manual calibration test:

1. Click Start and wait for the camera preview.
2. Click Calibrate.
3. Stand front-facing with arms relaxed for 3 seconds.
4. Confirm progress reaches 100%, quality and warnings update, and shoulder width, torso height, body scale, and average visibility display values.
5. Confirm the source reads "active for this session"; click Save calibration or rely on the demo auto-save.
6. Stop and start tracking, then click Load calibration and confirm the source reads "loaded from saved data".
7. Click Clear saved calibration and confirm the source returns to "none".
8. Raise a hand in both close-up and full-body framing and compare gesture behavior before and after calibration.

`leftHandUp` and `rightHandUp` use anatomical MediaPipe labels and are intended for mostly front-facing poses. Use `handUp` when side-facing workout positions need support; it activates when at least one visible wrist is clearly above its matching shoulder without requiring a front-facing body.
The arm-pose gestures use Pose Landmarker body landmarks only. They do not require or enable MediaPipe hand tracking.

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
