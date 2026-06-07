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

if (!video || !overlay || !startButton || !stopButton || !statusElement || !gesturesElement) {
  throw new Error("Example UI failed to initialize.");
}

const activeGestures = new Map<string, GestureResult>();
let tracker: MotionTracker | undefined;

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
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
  gestures: {
    enabled: true,
    names: ["leftHandUp", "rightHandUp", "bothHandsUp"],
    minConfidence: 0.5,
  },
  exercises: {
    enabled: false,
  },
  minConfidence: 0.5,
  smoothing: {
    enabled: false,
  },
};

startButton.addEventListener("click", () => {
  void startTracking();
});

stopButton.addEventListener("click", () => {
  stopTracking();
});

async function startTracking(): Promise<void> {
  setControlsStarting();
  activeGestures.clear();
  updateGestureText();

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
    updateGestureText();
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

    updateGestureText();
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
