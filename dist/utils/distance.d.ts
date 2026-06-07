import type { Landmark } from "../types";
export interface Point2D {
    x: number;
    y: number;
}
export interface Point3D extends Point2D {
    z?: number;
}
export declare function distance2D(firstPoint: Point2D, secondPoint: Point2D): number;
export declare function distance3D(firstPoint: Point3D, secondPoint: Point3D): number;
export declare function landmarkDistance2D(firstLandmark: Landmark, secondLandmark: Landmark): number;
export declare function landmarkDistance3D(firstLandmark: Landmark, secondLandmark: Landmark): number;
//# sourceMappingURL=distance.d.ts.map