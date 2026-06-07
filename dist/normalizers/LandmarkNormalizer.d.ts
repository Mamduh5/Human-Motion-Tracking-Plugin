import type { Landmark } from "../types";
export declare const POSE_LANDMARK_NAMES: readonly ["nose", "leftEyeInner", "leftEye", "leftEyeOuter", "rightEyeInner", "rightEye", "rightEyeOuter", "leftEar", "rightEar", "mouthLeft", "mouthRight", "leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist", "leftPinky", "rightPinky", "leftIndex", "rightIndex", "leftThumb", "rightThumb", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle", "leftHeel", "rightHeel", "leftFootIndex", "rightFootIndex"];
export type PoseLandmarkName = (typeof POSE_LANDMARK_NAMES)[number];
export type UnnamedLandmark = Omit<Landmark, "name" | "index"> & Partial<Pick<Landmark, "name" | "index">>;
export declare function getPoseLandmarkName(index: number): PoseLandmarkName | `landmark-${number}`;
export declare function normalizeLandmarks(landmarks: UnnamedLandmark[]): Landmark[];
export declare function getLandmarkByName(landmarks: Landmark[], name: string): Landmark | undefined;
export declare function getLandmarksByName(landmarks: Landmark[], names: string[]): Landmark[];
export declare function filterLandmarksByVisibility(landmarks: Landmark[], minVisibility: number): Landmark[];
export declare function filterLandmarksByConfidence(landmarks: Landmark[], minConfidence: number): Landmark[];
export declare function calculateLandmarkConfidence(landmarks: Pick<Landmark, "visibility">[]): number;
//# sourceMappingURL=LandmarkNormalizer.d.ts.map