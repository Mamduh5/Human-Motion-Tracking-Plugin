import type { Landmark } from "../types";
export interface Point2D {
    x: number;
    y: number;
}
export declare function calculateBodyCenter(landmarks: Landmark[]): Point2D | null;
export declare function calculateBodyScale(landmarks: Landmark[]): number | null;
export declare function calculateDistance(firstPoint: Point2D, secondPoint: Point2D): number;
//# sourceMappingURL=CoordinateMapper.d.ts.map