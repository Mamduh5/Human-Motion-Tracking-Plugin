import {
  CameraManager,
  MotionTracker,
  clearCalibration as clearStoredCalibration,
  loadCalibration as loadStoredCalibration,
  saveCalibration as saveStoredCalibration,
  type CalibrationMetrics,
  type CalibrationProgressEvent,
  type CalibrationResult,
  type GestureDebugEvent,
  type GestureResult,
  type MotionTrackerConfig,
  type PoseResult,
} from "../../../src/index";
import { clearPose, renderPose } from "./renderPose";

const video = document.querySelector<HTMLVideoElement>("#video");
const overlay = document.querySelector<HTMLCanvasElement>("#overlay");
const startButton = document.querySelector<HTMLButtonElement>("#startButton");
const stopButton = document.querySelector<HTMLButtonElement>("#stopButton");
const calibrateButton = document.querySelector<HTMLButtonElement>("#calibrateButton");
const cancelCalibrationButton = document.querySelector<HTMLButtonElement>("#cancelCalibrationButton");
const saveCalibrationButton = document.querySelector<HTMLButtonElement>("#saveCalibrationButton");
const loadCalibrationButton = document.querySelector<HTMLButtonElement>("#loadCalibrationButton");
const clearSavedCalibrationButton = document.querySelector<HTMLButtonElement>("#clearSavedCalibrationButton");
const statusElement = document.querySelector<HTMLElement>("#status");
const gesturesElement = document.querySelector<HTMLElement>("#gestures");
const calibrationStatusElement = document.querySelector<HTMLElement>("#calibrationStatus");
const calibrationProgressElement = document.querySelector<HTMLElement>("#calibrationProgress");
const calibrationQualityElement = document.querySelector<HTMLElement>("#calibrationQuality");
const calibrationSourceElement = document.querySelector<HTMLElement>("#calibrationSource");
const calibrationWarningsElement = document.querySelector<HTMLElement>("#calibrationWarnings");
const calibrationQaWarningElement = document.querySelector<HTMLElement>("#calibrationQaWarning");
const calibrationShoulderWidthElement = document.querySelector<HTMLElement>("#calibrationShoulderWidth");
const calibrationTorsoHeightElement = document.querySelector<HTMLElement>("#calibrationTorsoHeight");
const calibrationBodyScaleElement = document.querySelector<HTMLElement>("#calibrationBodyScale");
const calibrationAverageVisibilityElement = document.querySelector<HTMLElement>("#calibrationAverageVisibility");
const detectionsPerSecondElement = document.querySelector<HTMLElement>("#detectionsPerSecond");
const averageDetectionMsElement = document.querySelector<HTMLElement>("#averageDetectionMs");
const framesSkippedElement = document.querySelector<HTMLElement>("#framesSkipped");
const precisionElement = document.querySelector<HTMLElement>("#precision");
const precisionSelect = document.querySelector<HTMLSelectElement>("#precisionSelect");
const stabilityToggle = document.querySelector<HTMLInputElement>("#stabilityToggle");
const debugToggle = document.querySelector<HTMLInputElement>("#debugToggle");
const gestureDebugElement = document.querySelector<HTMLElement>("#gestureDebug");

if (
  !video ||
  !overlay ||
  !startButton ||
  !stopButton ||
  !calibrateButton ||
  !cancelCalibrationButton ||
  !saveCalibrationButton ||
  !loadCalibrationButton ||
  !clearSavedCalibrationButton ||
  !statusElement ||
  !gesturesElement ||
  !calibrationStatusElement ||
  !calibrationProgressElement ||
  !calibrationQualityElement ||
  !calibrationSourceElement ||
  !calibrationWarningsElement ||
  !calibrationQaWarningElement ||
  !calibrationShoulderWidthElement ||
  !calibrationTorsoHeightElement ||
  !calibrationBodyScaleElement ||
  !calibrationAverageVisibilityElement ||
  !detectionsPerSecondElement ||
  !averageDetectionMsElement ||
  !framesSkippedElement ||
  !precisionElement ||
  !precisionSelect ||
  !stabilityToggle ||
  !debugToggle ||
  !gestureDebugElement
) {
  throw new Error("Example UI failed to initialize.");
}

const CALIBRATION_STORAGE_KEY = "humanMotionTrackingCalibration";
const activeGestures = new Map<string, GestureResult>();
const rawGestureDebug = new Map<string, GestureDebugEvent>();
const stableGestureDebug = new Map<string, GestureResult>();
let tracker: MotionTracker | undefined;

function createTrackerConfig(): MotionTrackerConfig {
  return {
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
      enabled: true,
      names: [
        "handUp",
        "leftHandUp",
        "rightHandUp",
        "bothHandsUp",
        "armsUp",
        "leftArmExtended",
        "rightArmExtended",
        "leftElbowBent",
        "rightElbowBent",
        "armsCrossed",
        "handsOnHips",
      ],
      minConfidence: 0.5,
      precision: precisionSelect.value as MotionTrackerConfig["gestures"]["precision"],
      stability: {
        enabled: stabilityToggle.checked,
        activeFrames: 3,
        inactiveFrames: 3,
      },
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
  };
}

startButton.addEventListener("click", () => {
  void startTracking();
});

stopButton.addEventListener("click", () => {
  stopTracking();
});

calibrateButton.addEventListener("click", () => {
  startCalibration();
});

cancelCalibrationButton.addEventListener("click", () => {
  tracker?.cancelCalibration();
});

saveCalibrationButton.addEventListener("click", () => {
  saveCurrentCalibration();
});

loadCalibrationButton.addEventListener("click", () => {
  loadSavedCalibration();
});

clearSavedCalibrationButton.addEventListener("click", () => {
  clearSavedCalibration();
});

debugToggle.addEventListener("change", () => {
  updateGestureDebug();
});

async function startTracking(): Promise<void> {
  setControlsStarting();
  activeGestures.clear();
  rawGestureDebug.clear();
  stableGestureDebug.clear();
  updateGestureText();
  updateGestureDebug();
  updatePerformanceReadout();
  resetCalibrationReadout();
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
    calibrateButton.disabled = false;
    cancelCalibrationButton.disabled = true;
    saveCalibrationButton.disabled = true;
    loadCalibrationButton.disabled = false;
    stabilityToggle.disabled = true;
    precisionSelect.disabled = true;
    updatePerformanceReadout();
  });
  tracker.on("stopped", () => {
    statusElement.textContent = "Stopped";
    startButton.disabled = false;
    stopButton.disabled = true;
    calibrateButton.disabled = true;
    cancelCalibrationButton.disabled = true;
    saveCalibrationButton.disabled = true;
    loadCalibrationButton.disabled = true;
    stabilityToggle.disabled = false;
    precisionSelect.disabled = false;
    activeGestures.clear();
    rawGestureDebug.clear();
    stableGestureDebug.clear();
    updateGestureText();
    updateGestureDebug();
    updatePerformanceReadout();
    resetCalibrationReadout();
    clearPose(overlay);
  });
  tracker.on("pose", (pose: PoseResult) => {
    renderPose(overlay, pose);
    updatePerformanceReadout();
  });
  tracker.on("gesture", (gesture: GestureResult) => {
    if (gesture.active) {
      activeGestures.set(gesture.name, gesture);
    } else {
      activeGestures.delete(gesture.name);
    }

    stableGestureDebug.set(gesture.name, gesture);
    updateGestureText();
    updateGestureDebug();
    updatePerformanceReadout();
  });
  tracker.on("gestureDebug", (debugEvent: GestureDebugEvent) => {
    rawGestureDebug.set(debugEvent.gesture.name, debugEvent);
    updateGestureText();
    updateGestureDebug();
    updatePerformanceReadout();
  });
  tracker.on("calibrationStarted", (event) => {
    calibrationStatusElement.textContent = "Collecting";
    calibrateButton.disabled = true;
    cancelCalibrationButton.disabled = false;
    saveCalibrationButton.disabled = true;
    updateCalibrationReadout({
      status: "collecting",
      elapsedMs: 0,
      durationMs: event.durationMs,
      sampleCount: 0,
      quality: "poor",
    });
  });
  tracker.on("calibrationProgress", (progress: CalibrationProgressEvent) => {
    updateCalibrationReadout(progress);
  });
  tracker.on("calibrationCompleted", (result: CalibrationResult) => {
    calibrationStatusElement.textContent = "Completed";
    calibrationProgressElement.textContent = "100%";
    calibrationQualityElement.textContent = result.quality;
    calibrationWarningsElement.textContent = formatWarnings(result.warnings);
    updateCalibrationSource("session");
    updateCalibrationQaWarning(result);
    updateCalibrationMetrics(result.metrics);
    saveStoredCalibration(CALIBRATION_STORAGE_KEY, result);
    saveCalibrationButton.disabled = false;
    calibrateButton.disabled = false;
    cancelCalibrationButton.disabled = true;
  });
  tracker.on("calibrationFailed", (event) => {
    calibrationStatusElement.textContent = event.message;
    calibrationWarningsElement.textContent = formatWarnings(event.warnings);
    calibrationQaWarningElement.textContent = formatWarnings(event.warnings);
    calibrateButton.disabled = false;
    cancelCalibrationButton.disabled = true;
  });
  tracker.on("calibrationCancelled", () => {
    calibrationStatusElement.textContent = "Cancelled";
    calibrateButton.disabled = false;
    cancelCalibrationButton.disabled = true;
  });
  tracker.on("error", (error) => {
    statusElement.textContent = error.message;
    startButton.disabled = false;
    stopButton.disabled = true;
    calibrateButton.disabled = true;
    cancelCalibrationButton.disabled = true;
    saveCalibrationButton.disabled = true;
    loadCalibrationButton.disabled = true;
    stabilityToggle.disabled = false;
    precisionSelect.disabled = false;
  });

  try {
    await tracker.start();
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : String(error);
    startButton.disabled = false;
    stopButton.disabled = true;
    calibrateButton.disabled = true;
    cancelCalibrationButton.disabled = true;
    saveCalibrationButton.disabled = true;
    loadCalibrationButton.disabled = true;
    stabilityToggle.disabled = false;
    precisionSelect.disabled = false;
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
  calibrateButton.disabled = true;
  cancelCalibrationButton.disabled = true;
  saveCalibrationButton.disabled = true;
  loadCalibrationButton.disabled = true;
}

function startCalibration(): void {
  try {
    tracker?.startCalibration({
      durationMs: 3000,
      minSamples: 8,
      pose: "neutral",
      minVisibility: 0.5,
    });
  } catch (error) {
    calibrationStatusElement.textContent = error instanceof Error ? error.message : String(error);
  }
}

function saveCurrentCalibration(): void {
  const result = tracker?.exportCalibration();

  if (!result) {
    calibrationStatusElement.textContent = "No calibration to save";
    return;
  }

  calibrationStatusElement.textContent = saveStoredCalibration(CALIBRATION_STORAGE_KEY, result) ? "Saved" : "Save unavailable";
  saveCalibrationButton.disabled = false;
}

function loadSavedCalibration(): void {
  const result = loadStoredCalibration(CALIBRATION_STORAGE_KEY);

  if (!result || !tracker) {
    calibrationStatusElement.textContent = result ? "Start tracking before loading" : "No saved calibration";
    return;
  }

  tracker.importCalibration(result);
  calibrationStatusElement.textContent = "Loaded";
  calibrationProgressElement.textContent = "100%";
  calibrationQualityElement.textContent = result.quality;
  calibrationWarningsElement.textContent = formatWarnings(result.warnings);
  updateCalibrationSource("saved");
  updateCalibrationQaWarning(result);
  updateCalibrationMetrics(result.metrics);
  saveCalibrationButton.disabled = false;
}

function clearSavedCalibration(): void {
  clearStoredCalibration(CALIBRATION_STORAGE_KEY);
  tracker?.clearCalibration();
  resetCalibrationReadout();
  calibrationStatusElement.textContent = "Saved calibration cleared";
  saveCalibrationButton.disabled = true;
}

function updateGestureText(): void {
  const names = [...activeGestures.keys()];

  gesturesElement.textContent = names.length > 0 ? names.join(", ") : "None";
}

function updatePerformanceReadout(): void {
  const state = tracker?.getState();

  detectionsPerSecondElement.textContent = formatNumber(state?.detectionsPerSecond);
  averageDetectionMsElement.textContent = formatNumber(state?.averageDetectionMs, "ms");
  framesSkippedElement.textContent = String(state?.framesSkipped ?? 0);
  precisionElement.textContent = precisionSelect.value;
}

function updateCalibrationReadout(progress: CalibrationProgressEvent): void {
  const percent = progress.durationMs > 0 ? Math.min(100, (progress.elapsedMs / progress.durationMs) * 100) : 100;

  calibrationProgressElement.textContent = `${Math.round(percent)}%`;
  calibrationQualityElement.textContent = progress.quality;
  calibrationWarningsElement.textContent = formatWarnings(progress.warnings);
  updateCalibrationQaWarning(progress);
  updateCalibrationMetrics(progress.metrics);
}

function updateCalibrationMetrics(metrics: Partial<CalibrationMetrics> | undefined): void {
  calibrationShoulderWidthElement.textContent = formatMetric(metrics?.shoulderWidth);
  calibrationTorsoHeightElement.textContent = formatMetric(metrics?.torsoHeight);
  calibrationBodyScaleElement.textContent = formatMetric(metrics?.bodyScale);
  calibrationAverageVisibilityElement.textContent = formatMetric(metrics?.averageVisibility);
}

function resetCalibrationReadout(): void {
  calibrationStatusElement.textContent = "Idle";
  calibrationProgressElement.textContent = "0%";
  calibrationQualityElement.textContent = "n/a";
  updateCalibrationSource("none");
  calibrationWarningsElement.textContent = "None";
  calibrationQaWarningElement.textContent = "None";
  updateCalibrationMetrics(undefined);
}

function updateCalibrationSource(source: "none" | "session" | "saved"): void {
  calibrationSourceElement.textContent =
    source === "session" ? "active for this session" : source === "saved" ? "loaded from saved data" : "none";
}

function updateCalibrationQaWarning(
  calibration: Pick<CalibrationProgressEvent, "quality" | "sampleCount" | "metrics" | "warnings">,
): void {
  const warnings: string[] = [];

  if (calibration.quality === "poor") {
    warnings.push("Calibration quality is poor");
  }

  if ((calibration.metrics?.averageVisibility ?? 1) < 0.65) {
    warnings.push("Average visibility is low");
  }

  if (calibration.warnings?.some((warning) => warning.toLowerCase().includes("too few samples"))) {
    warnings.push("Too few usable samples");
  }

  calibrationQaWarningElement.textContent = warnings.length > 0 ? warnings.join(", ") : "None";
}

function updateGestureDebug(): void {
  gestureDebugElement.hidden = !debugToggle.checked;

  if (!debugToggle.checked) {
    return;
  }

  gestureDebugElement.replaceChildren();
  gestureDebugElement.append(
    createDebugSection("Raw detector results", rawGestureDebug, createRawGestureDebugRow, "No raw detector results yet."),
  );
  gestureDebugElement.append(
    createDebugSection("Stable emitted gestures", stableGestureDebug, createStableGestureDebugRow, "No stable gesture events yet."),
  );
}

function createDebugSection<TValue>(
  title: string,
  rows: Map<string, TValue>,
  createRow: (value: TValue) => HTMLElement,
  emptyText: string,
): HTMLElement {
  const section = document.createElement("section");
  section.className = "debug-section";
  const heading = document.createElement("h2");
  heading.textContent = title;
  section.append(heading);

  if (rows.size === 0) {
    const empty = document.createElement("p");
    empty.className = "debug-empty";
    empty.textContent = emptyText;
    section.append(empty);
    return section;
  }

  for (const row of rows.values()) {
    section.append(createRow(row));
  }

  return section;
}

function createRawGestureDebugRow(debugEvent: GestureDebugEvent): HTMLElement {
  const row = document.createElement("div");
  row.className = "debug-row debug-row-raw";
  const gesture = debugEvent.gesture;
  const metadata = gesture.metadata ?? {};
  const values = [
    gesture.name,
    `raw active: ${gesture.active ? "true" : "false"}`,
    `confidence: ${gesture.confidence.toFixed(2)}`,
    `reason: ${formatMetadataValue(metadata.reason)}`,
    `orientation: ${formatMetadataValue(metadata.orientation)}`,
    `handTopY: ${formatMetadataValue(metadata.handTopY)}`,
    `handTop: ${formatMetadataValue(metadata.handTopLandmarkName)}`,
    `yDelta: ${formatMetadataValue(metadata.yDelta)}`,
    `shoulderY: ${formatMetadataValue(metadata.shoulderY)}`,
    `visibility: ${formatMetadataValue(metadata.requiredVisibility)}`,
    `sideResults: ${formatMetadataValue(metadata.sideResults)}`,
    `candidates: ${formatMetadataValue(metadata.activeSideCandidates)}`,
    `passed min: ${debugEvent.passedMinConfidence ? "true" : "false"}`,
    `stable emitted: ${debugEvent.stabilityEmitted ? "true" : "false"}`,
  ];

  appendCells(row, values);

  return row;
}

function createStableGestureDebugRow(gesture: GestureResult): HTMLElement {
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

  appendCells(row, values);

  return row;
}

function appendCells(row: HTMLElement, values: string[]): void {
  for (const value of values) {
    const cell = document.createElement("span");
    cell.textContent = value;
    row.append(cell);
  }
}

function formatMetadataValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    return formatObjectValue(value);
  }

  return "n/a";
}

function formatNumber(value: number | undefined, suffix = ""): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return suffix ? `0.0 ${suffix}` : "0.0";
  }

  return suffix ? `${value.toFixed(1)} ${suffix}` : value.toFixed(1);
}

function formatMetric(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(3) : "n/a";
}

function formatWarnings(warnings: string[] | undefined): string {
  return warnings && warnings.length > 0 ? warnings.join(", ") : "None";
}

function formatObjectValue(value: object): string {
  return Object.entries(value)
    .map(([key, entryValue]) => `${key}:${formatNestedValue(entryValue)}`)
    .join(", ");
}

function formatNestedValue(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => formatNestedValue(item)).join("|")}]`;
  }

  if (value && typeof value === "object") {
    return `{${formatObjectValue(value)}}`;
  }

  return String(value);
}
