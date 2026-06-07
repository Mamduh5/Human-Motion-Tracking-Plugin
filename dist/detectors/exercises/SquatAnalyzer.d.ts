import type { ExerciseResult, PoseResult } from "../../types";
export type SquatStage = "up" | "down" | "unknown";
export interface SquatAnalyzerOptions {
    downAngle?: number;
    upAngle?: number;
    minVisibility?: number;
}
export declare class SquatAnalyzer {
    private readonly downAngle;
    private readonly upAngle;
    private readonly minVisibility;
    private stage;
    private reps;
    private hasReachedDown;
    constructor(options?: SquatAnalyzerOptions);
    analyze(pose: PoseResult): ExerciseResult;
    reset(): void;
    getStage(): SquatStage;
    getReps(): number;
    private getVisibleLegMeasurements;
    private getLegMeasurement;
    private getStageFromAngle;
    private createResult;
}
//# sourceMappingURL=SquatAnalyzer.d.ts.map