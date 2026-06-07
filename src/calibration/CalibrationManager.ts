import type {
  CalibrationCancelledEvent,
  CalibrationOptions,
  CalibrationProgressEvent,
  CalibrationResult,
  CalibrationStartedEvent,
  CalibrationStatus,
} from "../types";
import type { PoseResult } from "../types";
import { getTimestamp } from "../utils";
import {
  calculateCalibrationSampleMetrics,
  createRecommendedGestureThresholds,
  DEFAULT_CALIBRATION_OPTIONS,
  getCalibrationQuality,
  getCalibrationWarnings,
  isCalibrationSampleUsable,
  summarizeCalibrationMetrics,
  type CalibrationSampleMetrics,
} from "./CalibrationMetrics";

export interface CalibrationManagerDependencies {
  now?: () => number;
}

export class CalibrationManager {
  private readonly now: () => number;
  private status: CalibrationStatus = "idle";
  private options: Required<CalibrationOptions> = DEFAULT_CALIBRATION_OPTIONS;
  private startedAt?: number;
  private result?: CalibrationResult;
  private samples: CalibrationSampleMetrics[] = [];
  private observedSampleCount = 0;

  constructor(dependencies: CalibrationManagerDependencies = {}) {
    this.now = dependencies.now ?? getTimestamp;
  }

  start(options: CalibrationOptions = {}): CalibrationStartedEvent {
    if (this.status === "collecting") {
      throw new Error("Calibration is already collecting pose samples.");
    }

    this.options = resolveCalibrationOptions(options);
    this.status = "collecting";
    this.startedAt = this.now();
    this.result = undefined;
    this.samples = [];
    this.observedSampleCount = 0;

    return {
      status: "collecting",
      timestamp: this.startedAt,
      durationMs: this.options.durationMs,
      options: this.options,
    };
  }

  addPoseSample(pose: PoseResult): CalibrationProgressEvent | undefined {
    if (this.status !== "collecting") {
      return undefined;
    }

    this.observedSampleCount += 1;

    const sample = calculateCalibrationSampleMetrics(pose, this.options.minVisibility);

    if (isCalibrationSampleUsable(sample, this.options.minVisibility)) {
      this.samples.push(sample);
    }

    return this.getProgress();
  }

  cancel(): CalibrationCancelledEvent | undefined {
    if (this.status !== "collecting") {
      return undefined;
    }

    this.status = "cancelled";

    return {
      status: "cancelled",
      timestamp: this.now(),
      sampleCount: this.samples.length,
    };
  }

  complete(): CalibrationResult {
    if (this.status !== "collecting") {
      if (this.result) {
        return this.result;
      }

      throw new Error("Calibration is not collecting pose samples.");
    }

    const metrics = summarizeCalibrationMetrics(this.samples);

    if (!metrics || this.samples.length === 0) {
      this.status = "failed";
      throw new Error("Calibration failed: no usable pose samples were collected.");
    }

    const quality = getCalibrationQuality(metrics, this.samples.length, this.options);
    const warnings = getCalibrationWarnings(metrics, this.samples.length, this.options);
    const result: CalibrationResult = {
      status: "completed",
      timestamp: this.now(),
      sampleCount: this.samples.length,
      quality,
      metrics,
      recommendedThresholds: createRecommendedGestureThresholds(metrics, quality),
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    this.status = "completed";
    this.result = result;

    return result;
  }

  getStatus(): CalibrationStatus {
    return this.status;
  }

  getResult(): CalibrationResult | undefined {
    return this.result;
  }

  getProgress(): CalibrationProgressEvent | undefined {
    if (this.status !== "collecting" || this.startedAt === undefined) {
      return undefined;
    }

    const elapsedMs = Math.max(0, this.now() - this.startedAt);
    const metrics = summarizeCalibrationMetrics(this.samples);
    const quality = getCalibrationQuality(metrics, this.samples.length, this.options);
    const warnings = getCalibrationWarnings(metrics, this.samples.length, this.options);

    return {
      status: "collecting",
      elapsedMs: Math.min(elapsedMs, this.options.durationMs),
      durationMs: this.options.durationMs,
      sampleCount: this.samples.length,
      quality,
      metrics,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  shouldComplete(): boolean {
    if (this.status !== "collecting" || this.startedAt === undefined) {
      return false;
    }

    return this.now() - this.startedAt >= this.options.durationMs;
  }

  reset(): void {
    this.status = "idle";
    this.options = DEFAULT_CALIBRATION_OPTIONS;
    this.startedAt = undefined;
    this.result = undefined;
    this.samples = [];
    this.observedSampleCount = 0;
  }

  getObservedSampleCount(): number {
    return this.observedSampleCount;
  }
}

function resolveCalibrationOptions(options: CalibrationOptions): Required<CalibrationOptions> {
  const durationMs = options.durationMs ?? DEFAULT_CALIBRATION_OPTIONS.durationMs;
  const minSamples = options.minSamples ?? DEFAULT_CALIBRATION_OPTIONS.minSamples;
  const minVisibility = options.minVisibility ?? DEFAULT_CALIBRATION_OPTIONS.minVisibility;

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error("CalibrationOptions.durationMs must be a non-negative number.");
  }

  if (!Number.isInteger(minSamples) || minSamples <= 0) {
    throw new Error("CalibrationOptions.minSamples must be a positive integer.");
  }

  if (!Number.isFinite(minVisibility) || minVisibility < 0 || minVisibility > 1) {
    throw new Error("CalibrationOptions.minVisibility must be between 0 and 1.");
  }

  return {
    durationMs,
    minSamples,
    pose: options.pose ?? DEFAULT_CALIBRATION_OPTIONS.pose,
    minVisibility,
  };
}
