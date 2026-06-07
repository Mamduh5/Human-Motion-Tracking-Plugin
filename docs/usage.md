# Usage Guide

This guide shows how to install and use `human-motion-tracking-plugin` in browser applications. The SDK provides a `MotionTracker` class that starts a camera stream, initializes MediaPipe Pose Landmarker, emits normalized pose landmarks, runs configured gesture detectors and exercise analyzers, and lets plugins observe or emit derived motion events.

## Install

```bash
npm install human-motion-tracking-plugin
```

For local development from this repository:

```bash
npm install
npm run build
```

Import the package root for the SDK:

```ts
import { MotionTracker } from "human-motion-tracking-plugin";
```

Import the optional React adapter from the React subpath:

```ts
import { useMotionTracker } from "human-motion-tracking-plugin/react";
```

## Browser Requirements

Live camera tracking is browser-only. It depends on:

- `navigator.mediaDevices.getUserMedia` for camera access.
- `requestAnimationFrame` for the frame loop.
- `document.createElement` if you do not provide a video element.
- A secure context. Use `https://` in production or `localhost` during development.
- A user permission grant for the camera.

Do not start `MotionTracker` during server-side rendering. Create and start it only in browser code, usually after a user action such as clicking a Start button.

## MediaPipe Assets

Pose tracking requires both MediaPipe model and wasm asset paths:

```ts
pose: {
  modelAssetPath:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  wasmAssetPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
}
```

`modelAssetPath` points to the `.task` model file used by `PoseLandmarker`. `wasmAssetPath` points to the MediaPipe Tasks Vision wasm directory used by `FilesetResolver.forVisionTasks`.

You can use hosted URLs, as shown above, or serve pinned assets from your own app:

```ts
pose: {
  modelAssetPath: "/models/pose_landmarker_lite.task",
  wasmAssetPath: "/mediapipe/wasm",
}
```

Self-hosting is useful when you need version pinning, offline support, stricter CSP rules, or faster local cache behavior. Make sure your server serves the model and wasm files with correct paths and allows the browser to fetch them.

## Basic MotionTracker Usage

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
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
  gestures: {
    enabled: false,
  },
  exercises: {
    enabled: false,
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

tracker.on("started", ({ timestamp }) => {
  console.log("started", timestamp);
});

tracker.on("pose", (pose) => {
  console.log("pose confidence", pose.confidence);
  console.log("landmarks", pose.landmarks);
});

tracker.on("error", (error) => {
  console.error(error.message);
});

await tracker.start();

// Later, for example when leaving the page:
tracker.stop();
```

The tracker emits `pose` events only when a pose is detected and its confidence is at least `config.minConfidence`.

## Performance / Low-Power Laptops

Pose detection can heat up older laptops if it runs at full camera or display refresh rate. `MotionTracker` keeps `requestAnimationFrame` for responsive start/stop behavior, but throttles MediaPipe detection based on `performance.targetFps`.

For weak devices:

- Use a 640x480 camera stream.
- Use `performance.targetFps` between 10 and 15.
- Start with `performance.profile: "low-power"`, `targetFps: 10`, and `adaptive: false` on older laptops.
- Avoid enabling pose, hands, and face tracking all at once on weak devices. This package currently tracks pose only, but holistic tracking will be heavier when enabled.
- Run `npm run dev:vanilla` manually from a terminal only when you need the local camera demo. It starts a long-running Vite server.
- In the vanilla demo, watch detections/sec, average detection time, and skipped frames. Disable “Use gesture stability” to confirm whether raw close-up hand gestures are active before the 3-frame stability filter.

```ts
const lowPowerConfig: MotionTrackerConfig = {
  ...config,
  camera: {
    facingMode: "user",
    width: 640,
    height: 480,
    frameRate: 10,
  },
  performance: {
    profile: "low-power",
    targetFps: 10,
    adaptive: false,
  },
};
```

## Gesture Precision

Gesture precision lets you tune detector sensitivity for camera quality, distance, lighting, and false-positive tolerance:

- `loose`: more sensitive. Use it when close-up webcam gestures are real but not consistently detected.
- `balanced`: default SDK behavior.
- `strict`: requires clearer poses and reduces false positives.

```ts
const config: MotionTrackerConfig = {
  ...baseConfig,
  gestures: {
    enabled: true,
    names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp", "armsUp"],
    minConfidence: 0.5,
    precision: "loose",
    thresholds: {
      handUpYMargin: 0.02,
      minVisibility: 0.4,
    },
  },
};
```

Use `thresholds` for targeted overrides after choosing a preset. For example, lowering `handUpYMargin` makes hand-up gestures activate with less vertical distance between hand and shoulder.

## Hand Tracking

Hand tracking is optional and disabled by default. It provides raw MediaPipe Hand Landmarker output in SDK-owned types so apps can inspect hand landmarks. Finger gestures are not implemented yet.

```ts
const tracker = new MotionTracker({
  ...config,
  hands: {
    enabled: true,
    modelAssetPath:
      "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
    wasmAssetPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    targetFps: 10,
  },
});

tracker.on("hands", (result) => {
  for (const hand of result.hands) {
    console.log(hand.handedness, hand.handednessScore, hand.landmarks);
  }
});
```

MediaPipe Hand Landmarker `detectForVideo` is synchronous and can block the UI thread. Use a lower hand detection rate than pose detection when possible. For low-power devices, start with pose `performance.targetFps` between 10 and 15 and `hands.targetFps` between 5 and 10.

If `hands.enabled` is true, `hands.modelAssetPath` and `hands.wasmAssetPath` are required. If hand tracking fails to initialize, `MotionTracker.start()` fails and emits an `error` event with a MediaPipe asset-loading message.

## Calibration

Calibration is optional. It uses the same Pose Landmarker output as normal tracking and does not add MediaPipe hand tracking. During calibration, ask the user to stand front-facing with arms relaxed for about 3 seconds. The SDK collects pose samples, computes body scale and visibility metrics, and recommends conservative gesture thresholds for that user, camera, and framing.

Calibration can help close-up and full-body views use better scaled thresholds. It cannot fix low MediaPipe pose accuracy, bad lighting, occluded joints, or a camera angle where the body is not visible enough.

```ts
const tracker = new MotionTracker({
  ...config,
  gestures: {
    enabled: true,
    names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp", "armsOpen", "handsOnHips"],
    precision: "balanced",
  },
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

tracker.on("calibrationStarted", () => {
  console.log("calibration started");
});

tracker.on("calibrationProgress", (progress) => {
  console.log(progress.elapsedMs, progress.sampleCount, progress.quality, progress.warnings);
});

tracker.on("calibrationCompleted", (result) => {
  console.log(result.metrics);
  console.log(result.recommendedThresholds);
});

tracker.on("calibrationFailed", (event) => {
  console.error(event.message, event.warnings);
});

await tracker.start();
tracker.startCalibration();
```

The promise API is useful for button flows:

```ts
await tracker.start();

try {
  const result = await tracker.calibrate({ durationMs: 3000 });
  tracker.applyCalibration(result);
} catch (error) {
  console.error(error);
}
```

Saved calibration can make repeated browser use faster:

```ts
const result = tracker.getCalibration();

if (result) {
  localStorage.setItem("motionCalibration", JSON.stringify(result));
}
```

Redo saved calibration when camera distance, lighting, camera angle, or the user changes. Saved data is user/camera-specific and should not be shared across people or substantially different setups.

The package also provides safe helpers:

```ts
import { loadCalibration, saveCalibration } from "human-motion-tracking-plugin";

const saved = loadCalibration("motionCalibration");

if (saved) {
  tracker.importCalibration(saved);
}

const current = tracker.exportCalibration();

if (current) {
  saveCalibration("motionCalibration", current);
}
```

The helpers default to `localStorage` only when browser APIs are available. In non-browser environments they return without throwing.

Available calibration methods:

- `calibrate(options?)`: starts calibration and resolves with a completed result.
- `startCalibration(options?)`: starts sampling from the existing tracking loop.
- `cancelCalibration()`: cancels an active calibration.
- `getCalibration()`: returns the last completed or applied result.
- `exportCalibration()`: returns the current calibration result for persistence.
- `importCalibration(result)`: validates and applies a saved calibration result.
- `applyCalibration(result)`: applies recommended thresholds.
- `clearCalibration()`: removes applied calibration thresholds.

The tracker must be running before calibration starts. If `calibration.autoApply` is true, completed recommendations are applied automatically. Thresholds resolve in this order: gesture precision preset, applied calibration recommendations, then explicit `gestures.thresholds`. User thresholds win.

## Using an Existing Video Element

If your UI already owns the preview element, pass a `CameraManager` dependency with that element:

```ts
import { CameraManager, MotionTracker } from "human-motion-tracking-plugin";

const videoElement = document.querySelector<HTMLVideoElement>("#preview");

if (!videoElement) {
  throw new Error("Missing preview video element.");
}

const tracker = new MotionTracker(config, {
  camera: new CameraManager({
    camera: config.camera,
    videoElement,
  }),
});
```

The camera manager will set `srcObject`, call `play()`, and stop all tracks when `tracker.stop()` is called.

## Hand-Up Gesture Example

Enable built-in hand-up detectors through `gestures.names`:

```ts
const tracker = new MotionTracker({
  ...config,
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
    enabled: false,
  },
});

const activeGestures = new Map<string, boolean>();

tracker.on("gesture", (gesture) => {
  if (gesture.active) {
    activeGestures.set(gesture.name, true);
  } else {
    activeGestures.delete(gesture.name);
  }

  console.log("active gestures", [...activeGestures.keys()]);
});

await tracker.start();
```

The hand-up detectors compare the highest visible hand point against the matching shoulder. The hand point can be wrist, index, pinky, or thumb; a hand is considered up when that point is clearly above the shoulder and the required landmarks are visible enough.

`leftHandUp` and `rightHandUp` use MediaPipe's anatomical landmark labels, so "left" means the tracked person's left side, not the viewer's left side in a mirrored camera preview. `leftHandUp`, `rightHandUp`, and `bothHandsUp` are intended for mostly front-facing poses and may stay inactive for side-facing poses to avoid mislabeled hands. For side-facing workout positions, prefer `handUp`; it activates when at least one clearly visible wrist is above its matching shoulder and does not require a front-facing body.

Built-in gesture names include:

- `handUp`
- `leftHandUp`
- `rightHandUp`
- `bothHandsUp`
- `armsOpen`
- `armsUp`
- `leftArmExtended`
- `rightArmExtended`
- `leftElbowBent`
- `rightElbowBent`
- `armsCrossed`
- `handsOnHips`
- `standing`

The arm-pose gestures use Pose Landmarker landmarks only: shoulder, elbow, wrist, index, pinky, thumb, and hip where needed. They do not enable MediaPipe hand tracking.

## Squat Analyzer Example

Enable the built-in squat analyzer through `exercises.names`:

```ts
const tracker = new MotionTracker({
  ...config,
  gestures: {
    enabled: false,
  },
  exercises: {
    enabled: true,
    names: ["squat"],
    minConfidence: 0.5,
  },
});

tracker.on("exercise", (exercise) => {
  if (exercise.name !== "squat") {
    return;
  }

  console.log({
    stage: exercise.stage,
    reps: exercise.reps,
    kneeAngle: exercise.metadata?.kneeAngle,
    warnings: exercise.warnings,
  });
});

await tracker.start();
```

The built-in squat analyzer uses visible hip, knee, and ankle landmarks. It reports:

- `stage`: `down`, `up`, or `unknown`.
- `reps`: completed repetitions.
- `metadata.kneeAngle`: average detected knee angle.
- `metadata.legsUsed`: the visible leg measurements used for analysis.
- `warnings`: messages for missing or low-visibility landmarks.

You can also use the analyzer directly with pose results:

```ts
import { SquatAnalyzer } from "human-motion-tracking-plugin";

const analyzer = new SquatAnalyzer({
  downAngle: 105,
  upAngle: 160,
  minVisibility: 0.5,
});

tracker.on("pose", (pose) => {
  const result = analyzer.analyze(pose);
  console.log(result.stage, result.reps);
});
```

## Plugin Registration Example

Plugins can observe tracker events and emit derived gesture or exercise events through a safe API:

```ts
import { MotionTracker, type MotionPlugin } from "human-motion-tracking-plugin";

const stillnessPlugin: MotionPlugin = {
  name: "stillness",
  onPose(pose, api) {
    if (pose.confidence < 0.9) {
      return;
    }

    api.emitGesture({
      name: "highConfidencePose",
      active: true,
      confidence: pose.confidence,
      timestamp: pose.timestamp,
    });
  },
};

const tracker = new MotionTracker(config);

tracker.registerPlugin(stillnessPlugin);

tracker.on("gesture", (gesture) => {
  if (gesture.name === "highConfidencePose") {
    console.log("plugin gesture", gesture.active);
  }
});
```

You can also use the helper:

```ts
import { registerPlugin } from "human-motion-tracking-plugin";

registerPlugin(tracker, stillnessPlugin);
```

## React Adapter Usage

The React adapter exposes `start`, `stop`, `state`, `latestPose`, `latestGestures`, `latestExercises`, and `error`.

```tsx
import { useMemo } from "react";
import { useMotionTracker } from "human-motion-tracking-plugin/react";
import type { MotionTrackerConfig } from "human-motion-tracking-plugin";

export function MotionTrackerPanel() {
  const config = useMemo<MotionTrackerConfig>(
    () => ({
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
        names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp", "armsUp", "armsCrossed", "handsOnHips"],
        minConfidence: 0.5,
        precision: "balanced",
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
    }),
    [],
  );

  const { start, stop, state, latestGestures, latestExercises, error } = useMotionTracker(config);
  const squat = latestExercises.find((exercise) => exercise.name === "squat");

  return (
    <section>
      <button type="button" onClick={() => void start()} disabled={state.status === "running"}>
        Start
      </button>
      <button type="button" onClick={stop} disabled={state.status !== "running"}>
        Stop
      </button>
      <p>Status: {state.status}</p>
      <p>Gestures: {latestGestures.map((gesture) => gesture.name).join(", ") || "None"}</p>
      <p>Squat reps: {squat?.reps ?? 0}</p>
      {error ? <p>{error.message}</p> : null}
    </section>
  );
}
```

The hook stops the tracker automatically when the component unmounts. Use `autoStart` only in browser-only components where camera permission prompts are acceptable without a separate Start click.

## Vanilla Web Example

Run the example from the repository root:

```bash
npm run dev:vanilla
```

Run this command manually when you want to use the camera demo; it starts a long-running Vite dev server.

Open the local Vite URL printed by the command. In most setups this is `http://localhost:5173/`, but Vite may choose another port if that one is busy.

Then:

1. Allow camera access when the browser prompts.
2. Click Start.
3. Click Calibrate and stand front-facing with arms relaxed for 3 seconds.
4. Confirm progress reaches 100%, quality and warnings update, and shoulder width, torso height, body scale, and average visibility display values.
5. Confirm the source reads "active for this session"; the demo auto-saves completed calibration.
6. Stop and start tracking again, then click Load calibration and confirm the source reads "loaded from saved data".
7. Click Clear saved calibration and confirm the source returns to "none".
8. Raise one or both hands to see `handUp`, `leftHandUp`, `rightHandUp`, `bothHandsUp`, or `armsUp`.
9. Try close-up and full-body framing after calibration to compare gesture threshold scaling.
10. Turn mostly side-facing and raise one visible hand to confirm `handUp` can stay active even when left/right-specific gestures are inactive.
11. Click Stop, enable hand tracking, and click Start again.
12. Show one or both hands and confirm hand count, handedness, confidence, and hands target FPS update.
13. Click Stop to stop the stream.

The example lives in `examples/vanilla-web`. It imports the SDK from `src/` for local development, passes an existing video element into `CameraManager`, renders landmarks on a canvas overlay, and displays active gestures.
By default it requests 640x480 at 10 FPS and uses the low-power performance profile. Use the performance readout to compare heat-related settings. The Precision select rebuilds the tracker on the next Start. Enable Show gesture debug to inspect raw detector results and disable Use gesture stability to see whether close-up left/right/both gestures are active before filtering. Calibration is applied automatically in the demo after it completes. Hand tracking is off by default; changing the hand tracking checkbox while running requires a restart.

## Useful Scripts

```bash
npm run build
npm test
npm run dev:vanilla
npm run build:vanilla
```
