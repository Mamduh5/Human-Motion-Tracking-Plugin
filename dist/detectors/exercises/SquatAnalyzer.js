import { getLandmarkByName } from "../../normalizers";
import { averageConfidence, calculateAngle, isLandmarkVisible } from "../../utils";
const DEFAULT_DOWN_ANGLE = 105;
const DEFAULT_UP_ANGLE = 160;
const DEFAULT_MIN_VISIBILITY = 0.5;
export class SquatAnalyzer {
    constructor(options = {}) {
        this.stage = "unknown";
        this.reps = 0;
        this.hasReachedDown = false;
        this.downAngle = options.downAngle ?? DEFAULT_DOWN_ANGLE;
        this.upAngle = options.upAngle ?? DEFAULT_UP_ANGLE;
        this.minVisibility = options.minVisibility ?? DEFAULT_MIN_VISIBILITY;
    }
    analyze(pose) {
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
    reset() {
        this.stage = "unknown";
        this.reps = 0;
        this.hasReachedDown = false;
    }
    getStage() {
        return this.stage;
    }
    getReps() {
        return this.reps;
    }
    getVisibleLegMeasurements(pose) {
        return ["left", "right"]
            .map((side) => this.getLegMeasurement(pose, side))
            .filter((measurement) => Boolean(measurement));
    }
    getLegMeasurement(pose, side) {
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
    getStageFromAngle(angle) {
        if (angle <= this.downAngle) {
            return "down";
        }
        if (angle >= this.upAngle) {
            return "up";
        }
        return "unknown";
    }
    createResult(timestamp, confidence, warnings, metadata) {
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
//# sourceMappingURL=SquatAnalyzer.js.map