import {
  CameraManager,
  MotionTracker,
  type GestureResult,
  type MotionTrackerConfig,
  type PoseResult,
} from "../../../src/index";
import { clearPose, renderPose } from "./renderPose";

const video = document.querySelector<HTMLVideoElement>("#video");
const overlay = document.querySelector<HTMLCanvasElement>("#overlay");
const startButton = document.querySelector<HTMLButtonElement>("#startButton");
const stopButton = document.querySelector<HTMLButtonElement>("#stopButton");
const statusElement = document.querySelector<HTMLElement>("#status");
const gesturesElement = document.querySelector<HTMLElement>("#gestures");
const lowPowerToggle = document.querySelector<HTMLInputElement>("#lowPowerToggle");
const debugToggle = document.querySelector<HTMLInputElement>("#debugToggle");
const gestureDebugElement = document.querySelector<HTMLElement>("#gestureDebug");

if (
  !video ||
  !overlay ||
  !startButton ||
  !stopButton ||
  !statusElement ||
  !gesturesElement ||
  !lowPowerToggle ||
  !debugToggle ||
  !gestureDebugElement
) {
  throw new Error("Example UI failed to initialize.");
}

const activeGestures = new Map<string, GestureResult>();
const gestureDebug = new Map<string, GestureResult>();
let tracker: MotionTracker | undefined;

function createTrackerConfig(): MotionTrackerConfig {
  const lowPower = lowPowerToggle.checked;

  return {
    mode: "pose",
    camera: {
      facingMode: "user",
      width: 640,
      height: 480,
      frameRate: lowPower ? 10 : 15,
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
      enabled: true,
      names: ["handUp", "leftHandUp", "rightHandUp", "bothHandsUp"],
      minConfidence: 0.5,
    },
    exercises: {
      enabled: false,
    },
    minConfidence: 0.5,
    smoothing: {
      enabled: false,
    },
    performance: {
      profile: lowPower ? "low-power" : "balanced",
      targetFps: lowPower ? 10 : 15,
    },
  };
}

startButton.addEventListener("click", () => {
  void startTracking();
});

stopButton.addEventListener("click", () => {
  stopTracking();
});

debugToggle.addEventListener("change", () => {
  updateGestureDebug();
});

async function startTracking(): Promise<void> {
  setControlsStarting();
  activeGestures.clear();
  gestureDebug.clear();
  updateGestureText();
  updateGestureDebug();
  const config = createTrackerConfig();

  tracker = new MotionTracker(config, {
    camera: new CameraManager({
      camera: config.camera,
      videoElement: video,
    }),
  });

  tracker.on("started", () => {
    statusElement.textContent = "Running";
    startButton.disabled = true;
    stopButton.disabled = false;
  });
  tracker.on("stopped", () => {
    statusElement.textContent = "Stopped";
    startButton.disabled = false;
    stopButton.disabled = true;
    activeGestures.clear();
    gestureDebug.clear();
    updateGestureText();
    updateGestureDebug();
    clearPose(overlay);
  });
  tracker.on("pose", (pose: PoseResult) => {
    renderPose(overlay, pose);
  });
  tracker.on("gesture", (gesture: GestureResult) => {
    if (gesture.active) {
      activeGestures.set(gesture.name, gesture);
    } else {
      activeGestures.delete(gesture.name);
    }

    gestureDebug.set(gesture.name, gesture);
    updateGestureText();
    updateGestureDebug();
  });
  tracker.on("error", (error) => {
    statusElement.textContent = error.message;
    startButton.disabled = false;
    stopButton.disabled = true;
  });

  try {
    await tracker.start();
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : String(error);
    startButton.disabled = false;
    stopButton.disabled = true;
  }
}

function stopTracking(): void {
  tracker?.stop();
  tracker = undefined;
}

function setControlsStarting(): void {
  statusElement.textContent = "Starting";
  startButton.disabled = true;
  stopButton.disabled = true;
}

function updateGestureText(): void {
  const names = [...activeGestures.keys()];

  gesturesElement.textContent = names.length > 0 ? names.join(", ") : "None";
}

function updateGestureDebug(): void {
  gestureDebugElement.hidden = !debugToggle.checked;

  if (!debugToggle.checked) {
    return;
  }

  gestureDebugElement.replaceChildren();

  if (gestureDebug.size === 0) {
    const empty = document.createElement("p");
    empty.className = "debug-empty";
    empty.textContent = "No stable gesture events yet.";
    gestureDebugElement.append(empty);
    return;
  }

  for (const gesture of gestureDebug.values()) {
    gestureDebugElement.append(createGestureDebugRow(gesture));
  }
}

function createGestureDebugRow(gesture: GestureResult): HTMLElement {
  const row = document.createElement("div");
  row.className = "debug-row";

  const metadata = gesture.metadata ?? {};
  const torsoWidth = metadata.torsoWidth;
  const values = [
    gesture.name,
    `active: ${gesture.active ? "true" : "false"}`,
    `reason: ${formatMetadataValue(metadata.reason)}`,
    `confidence: ${gesture.confidence.toFixed(2)}`,
    `torsoWidth: ${typeof torsoWidth === "number" ? torsoWidth.toFixed(3) : "n/a"}`,
  ];

  for (const value of values) {
    const cell = document.createElement("span");
    cell.textContent = value;
    row.append(cell);
  }

  return row;
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "n/a";
}
