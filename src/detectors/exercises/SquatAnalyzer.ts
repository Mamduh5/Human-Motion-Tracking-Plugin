import { getLandmarkByName } from "../../normalizers";
import type { ExerciseResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, calculateAngle, isLandmarkVisible } from "../../utils";

export type SquatStage = "up" | "down" | "unknown";

export interface SquatAnalyzerOptions {
  downAngle?: number;
  upAngle?: number;
  minVisibility?: number;
}

interface LegMeasurement {
  angle: number;
  landmarks: Landmark[];
  side: "left" | "right";
}

const DEFAULT_DOWN_ANGLE = 105;
const DEFAULT_UP_ANGLE = 160;
const DEFAULT_MIN_VISIBILITY = 0.5;

export class SquatAnalyzer {
  private readonly downAngle: number;
  private readonly upAngle: number;
  private readonly minVisibility: number;
  private stage: SquatStage = "unknown";
  private reps = 0;
  private hasReachedDown = false;

  constructor(options: SquatAnalyzerOptions = {}) {
    this.downAngle = options.downAngle ?? DEFAULT_DOWN_ANGLE;
    this.upAngle = options.upAngle ?? DEFAULT_UP_ANGLE;
    this.minVisibility = options.minVisibility ?? DEFAULT_MIN_VISIBILITY;
  }

  analyze(pose: PoseResult): ExerciseResult {
    const measurements = this.getVisibleLegMeasurements(pose);

    if (measurements.length === 0) {
      this.stage = "unknown";

      return this.createResult(pose.timestamp, 0, ["Missing or low-visibility hip, knee, or ankle landmarks."]);
    }

    const angle = measurements.reduce((total, measurement) => total + measurement.angle, 0) / measurements.length;
    const landmarks = measurements.flatMap((measurement) => measurement.landmarks);
    const nextStage = this.getStageFromAngle(angle);

    if (nextStage === "down") {
      this.hasReachedDown = true;
    }

    if (nextStage === "up" && this.hasReachedDown && this.stage !== "up") {
      this.reps += 1;
      this.hasReachedDown = false;
    }

    this.stage = nextStage;

    return this.createResult(pose.timestamp, averageConfidence(landmarks), undefined, {
      kneeAngle: angle,
      legsUsed: measurements.map((measurement) => measurement.side),
    });
  }

  reset(): void {
    this.stage = "unknown";
    this.reps = 0;
    this.hasReachedDown = false;
  }

  getStage(): SquatStage {
    return this.stage;
  }

  getReps(): number {
    return this.reps;
  }

  private getVisibleLegMeasurements(pose: PoseResult): LegMeasurement[] {
    return (["left", "right"] as const)
      .map((side) => this.getLegMeasurement(pose, side))
      .filter((measurement): measurement is LegMeasurement => Boolean(measurement));
  }

  private getLegMeasurement(pose: PoseResult, side: "left" | "right"): LegMeasurement | null {
    const hip = getLandmarkByName(pose.landmarks, `${side}Hip`);
    const knee = getLandmarkByName(pose.landmarks, `${side}Knee`);
    const ankle = getLandmarkByName(pose.landmarks, `${side}Ankle`);

    if (!hip || !knee || !ankle) {
      return null;
    }

    const landmarks = [hip, knee, ankle];

    if (!landmarks.every((landmark) => isLandmarkVisible(landmark, this.minVisibility))) {
      return null;
    }

    return {
      angle: calculateAngle(hip, knee, ankle),
      landmarks,
      side,
    };
  }

  private getStageFromAngle(angle: number): SquatStage {
    if (angle <= this.downAngle) {
      return "down";
    }

    if (angle >= this.upAngle) {
      return "up";
    }

    return "unknown";
  }

  private createResult(
    timestamp: number,
    confidence: number,
    warnings?: string[],
    metadata?: Record<string, unknown>,
  ): ExerciseResult {
    return {
      name: "squat",
      stage: this.stage,
      reps: this.reps,
      confidence,
      timestamp,
      warnings,
      metadata,
    };
  }
}
