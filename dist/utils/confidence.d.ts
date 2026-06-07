import type { Landmark } from "../types";
export declare function averageConfidence(landmarks: Pick<Landmark, "visibility">[]): number;
export declare function isLandmarkVisible(landmark: Pick<Landmark, "visibility">, minVisibility?: number): boolean;
//# sourceMappingURL=confidence.d.ts.map