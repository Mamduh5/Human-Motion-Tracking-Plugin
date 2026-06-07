import type { Landmark } from "../types";
export interface SmoothingFilterOptions {
    alpha?: number;
}
export declare function smoothLandmarks(currentLandmarks: Landmark[], previousLandmarks: Landmark[], alpha?: number): Landmark[];
export declare class SmoothingFilter {
    private previousLandmarks;
    private readonly alpha;
    constructor(options?: SmoothingFilterOptions);
    apply(landmarks: Landmark[]): Landmark[];
    reset(): void;
}
//# sourceMappingURL=SmoothingFilter.d.ts.map