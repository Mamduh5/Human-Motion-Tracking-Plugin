# Architecture

`human-motion-tracking-plugin` is organized as a small browser SDK with clear layers around camera access, landmark tracking, result normalization, built-in detectors, events, plugins, and adapters.

## Main Layers

### MotionTracker

`MotionTracker` is the orchestration class. It:

- Resolves and validates `MotionTrackerConfig`.
- Starts and stops the camera source.
- Initializes and disposes the landmark tracker.
- Schedules the frame loop with `requestAnimationFrame` and throttles pose detection by configured target FPS.
- Emits `pose`, `gesture`, `exercise`, calibration, `started`, `stopped`, and `error` events.
- Dispatches events to registered plugins.
- Applies optional calibration recommendations to gesture thresholds.

The public lifecycle is:

```ts
const tracker = new MotionTracker(config);

tracker.on("pose", handlePose);
await tracker.start();
tracker.stop();
```

### Camera Layer

`CameraManager` implements the `CameraSource` interface:

```ts
interface CameraSource {
  start(): Promise<HTMLVideoElement>;
  stop(): void;
  getVideoElement(): HTMLVideoElement;
  isRunning(): boolean;
}
```

It calls `navigator.mediaDevices.getUserMedia`, attaches the stream to a video element, plays it, and stops all media tracks on shutdown.

You can inject your own `CameraSource` through `MotionTrackerDependencies` for tests, custom capture flows, prerecorded streams, or app-owned camera management.

### Tracker Provider

`TrackerProvider` creates the configured landmark tracker. The current `MotionTracker` implementation supports `mode: "pose"` and requires `config.pose`.

`PoseTracker` wraps `@mediapipe/tasks-vision`:

- `FilesetResolver.forVisionTasks(config.wasmAssetPath)` loads the MediaPipe wasm files.
- `PoseLandmarker.createFromOptions(...)` loads the `.task` model.
- `detectForVideo(video, timestamp)` produces per-frame pose results.

`mode: "holistic"` exists in types, but `MotionTracker` currently rejects it because holistic tracking is not implemented in the orchestration path.

### Normalizers and Utilities

MediaPipe landmark output is converted into SDK `PoseResult` objects:

```ts
interface PoseResult {
  timestamp: number;
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
  confidence: number;
}
```

Utilities provide named landmark lookup, confidence calculation, visibility filtering, body measurements, smoothing helpers, angle calculations, and 2D/3D distance functions.

### Built-In Detectors

Gesture detectors run after a valid pose is emitted when `config.gestures.enabled` is true. Built-in names are:

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

Exercise analyzers run when `config.exercises.enabled` is true. The built-in analyzer name is:

- `squat`

The squat analyzer tracks stage transitions and repetition count from visible hip, knee, and ankle landmarks.

`leftHandUp`, `rightHandUp`, and `bothHandsUp` use anatomical left/right labels and require a mostly front-facing body. `handUp` is the side-view-safe option for workout positions where either visible wrist above its matching shoulder should count.
The arm-pose gestures use Pose Landmarker body landmarks only. They do not require MediaPipe hand tracking.

### Calibration

`CalibrationManager` collects pose samples from the existing `MotionTracker` frame loop. It measures visible shoulders, hips, elbows, and wrists, then summarizes median body metrics:

- shoulder width
- hip width
- torso height
- body scale
- left and right arm length
- average visibility
- front-facing score

Calibration is optional and pose-only. It improves threshold scaling for close-up and full-body camera views, but it does not replace MediaPipe pose accuracy. Low visibility, missing shoulders, missing hips, side-facing poses, and too few usable samples are reported as warnings.

When calibration is applied, gesture thresholds resolve in this order:

1. Gesture precision preset.
2. Applied calibration recommendations.
3. Explicit `gestures.thresholds`.

Explicit user thresholds win over calibration so app-specific tuning is preserved.

### Event System

`MotionTracker` uses a typed event emitter. Consumers subscribe with `on` and remove handlers with `off`.

```ts
tracker.on("gesture", (gesture) => {
  console.log(gesture.name, gesture.active);
});

tracker.off("gesture", handler);
```

Events are synchronous within the frame processing path. Keep handlers lightweight. If you need expensive work, schedule it outside the frame loop.

Calibration event names are:

- `calibrationStarted`
- `calibrationProgress`
- `calibrationCompleted`
- `calibrationFailed`
- `calibrationCancelled`

### Plugin Layer

Plugins implement `MotionPlugin` and are registered by name. They receive lifecycle, pose, gesture, and exercise callbacks. Plugins can emit derived gesture or exercise events through `MotionPluginApi`, but they cannot control the camera, frame loop, or MediaPipe internals.

This keeps plugin code isolated from the core tracker lifecycle while still allowing custom motion logic.

### React Adapter

The optional React adapter wraps `MotionTracker` in a hook:

```ts
const { start, stop, state, latestPose, latestGestures, latestExercises, error } =
  useMotionTracker(config);
```

The hook owns a tracker instance, mirrors the latest event data into React state, and stops the tracker on unmount.

React is an optional peer dependency and is exported from `human-motion-tracking-plugin/react`.

## Frame Flow

The live tracking flow is:

1. App creates `MotionTracker` with `MotionTrackerConfig`.
2. App registers event handlers and optional plugins.
3. App calls `start()` from browser code.
4. `PoseTracker.initialize()` loads MediaPipe wasm and model assets.
5. `CameraManager.start()` requests camera permission and starts the video stream.
6. `MotionTracker` emits `started`.
7. Each animation frame updates loop state and checks the performance throttle.
8. When enough time has passed for `performance.targetFps`, `landmarkTracker.detect(video, timestamp)` runs.
9. A valid pose emits `pose`.
10. If calibration is collecting, the pose is sampled and calibration progress or completion events may emit.
11. Enabled gesture detectors emit `gesture` using precision, calibration, and user threshold resolution.
12. Enabled exercise analyzers emit `exercise`.
13. Plugins receive each relevant event and may emit derived events.
14. App calls `stop()`, which cancels the frame loop, stops camera tracks, disposes MediaPipe, and emits `stopped`.

## Configuration Shape

```ts
interface MotionTrackerConfig {
  mode: "pose" | "holistic";
  camera: {
    deviceId?: string;
    facingMode?: "user" | "environment";
    width?: number;
    height?: number;
    frameRate?: number;
  };
  pose?: {
    modelAssetPath: string;
    wasmAssetPath: string;
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
    numPoses?: number;
  };
  gestures: {
    enabled: boolean;
    names?: string[];
    minConfidence?: number;
    precision?: "loose" | "balanced" | "strict";
    thresholds?: Partial<GestureThresholds>;
    stability?: {
      enabled?: boolean;
      activeFrames?: number;
      inactiveFrames?: number;
    };
  };
  exercises: {
    enabled: boolean;
    names?: string[];
    minConfidence?: number;
  };
  minConfidence: number;
  smoothing: {
    enabled: boolean;
    factor?: number;
    windowSize?: number;
  };
  performance?: {
    targetFps?: number;
    profile?: "low-power" | "balanced" | "quality";
    adaptive?: boolean;
  };
  calibration?: {
    enabled?: boolean;
    autoApply?: boolean;
    options?: {
      durationMs?: number;
      minSamples?: number;
      pose?: "neutral";
      minVisibility?: number;
    };
  };
}
```

For `mode: "pose"`, both `pose.modelAssetPath` and `pose.wasmAssetPath` are required.
Performance defaults to the balanced profile at 15 FPS. The low-power profile defaults to 10 FPS, and the quality profile defaults to 30 FPS.
Gesture stability defaults to enabled with three active frames and three inactive frames.
Gesture precision defaults to balanced. The loose preset is more sensitive; the strict preset reduces false positives.
Calibration is optional. `autoApply` applies completed recommended thresholds automatically; explicit `gestures.thresholds` still win.

## Browser-Only Camera Requirements

The camera and live tracking path must run in a browser. Required APIs include:

- `navigator.mediaDevices.getUserMedia`
- `HTMLVideoElement`
- `requestAnimationFrame`
- `window.cancelAnimationFrame`
- `document.createElement` when no video element is injected

Browsers generally require camera access to run from a secure context. Use `https://` in production or `localhost` during development. Camera permission can be denied by users, browser settings, iframe permission policies, or OS privacy controls, so production apps should handle the `error` event and failed `start()` calls.

Server-side rendering environments do not provide these APIs. In React, create and start tracking inside client-only code, event handlers, or effects that only run in the browser.

## MediaPipe Model and Wasm Paths

The SDK does not bundle MediaPipe model assets. The app supplies paths:

```ts
pose: {
  modelAssetPath:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
  wasmAssetPath: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
}
```

`modelAssetPath` must resolve to a Pose Landmarker `.task` file. `wasmAssetPath` must resolve to the directory containing the MediaPipe Tasks Vision wasm assets for the package version in use.

If you self-host assets, keep the model and wasm versions pinned with your application release. A mismatch between package version and wasm files can cause MediaPipe initialization failures. The SDK wraps these failures with an error message that asks you to check `modelAssetPath` and `wasmAssetPath`.

## Testing and Dependency Injection

`MotionTracker` accepts dependencies for camera, landmark tracker, animation frame methods, and time:

```ts
const tracker = new MotionTracker(config, {
  camera: customCameraSource,
  landmarkTracker: customLandmarkTracker,
  requestAnimationFrame: customRequestFrame,
  cancelAnimationFrame: customCancelFrame,
  now: () => Date.now(),
});
```

This keeps core behavior testable without a real camera or MediaPipe runtime and allows advanced consumers to integrate custom frame sources.
