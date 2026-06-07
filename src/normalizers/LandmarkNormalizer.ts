import type { Landmark } from "../types";
import { averageConfidence, isLandmarkVisible } from "../utils";

export const POSE_LANDMARK_NAMES = [
  "nose",
  "leftEyeInner",
  "leftEye",
  "leftEyeOuter",
  "rightEyeInner",
  "rightEye",
  "rightEyeOuter",
  "leftEar",
  "rightEar",
  "mouthLeft",
  "mouthRight",
  "leftShoulder",
  "rightShoulder",
  "leftElbow",
  "rightElbow",
  "leftWrist",
  "rightWrist",
  "leftPinky",
  "rightPinky",
  "leftIndex",
  "rightIndex",
  "leftThumb",
  "rightThumb",
  "leftHip",
  "rightHip",
  "leftKnee",
  "rightKnee",
  "leftAnkle",
  "rightAnkle",
  "leftHeel",
  "rightHeel",
  "leftFootIndex",
  "rightFootIndex",
] as const;

export type PoseLandmarkName = (typeof POSE_LANDMARK_NAMES)[number];
export type UnnamedLandmark = Omit<Landmark, "name" | "index"> & Partial<Pick<Landmark, "name" | "index">>;

export function getPoseLandmarkName(index: number): PoseLandmarkName | `landmark-${number}` {
  return POSE_LANDMARK_NAMES[index] ?? `landmark-${index}`;
}

export function normalizeLandmarks(landmarks: UnnamedLandmark[]): Landmark[] {
  return landmarks.map((landmark, index) => ({
    name: landmark.name ?? getPoseLandmarkName(index),
    index: landmark.index ?? index,
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
  }));
}

export function getLandmarkByName(landmarks: Landmark[], name: string): Landmark | undefined {
  return landmarks.find((landmark) => landmark.name === name);
}

export function getLandmarksByName(landmarks: Landmark[], names: string[]): Landmark[] {
  const requestedNames = new Set(names);

  return landmarks.filter((landmark) => requestedNames.has(landmark.name));
}

export function filterLandmarksByVisibility(landmarks: Landmark[], minVisibility: number): Landmark[] {
  return landmarks.filter((landmark) => isLandmarkVisible(landmark, minVisibility));
}

export function filterLandmarksByConfidence(landmarks: Landmark[], minConfidence: number): Landmark[] {
  return filterLandmarksByVisibility(landmarks, minConfidence);
}

export function calculateLandmarkConfidence(landmarks: Pick<Landmark, "visibility">[]): number {
  return averageConfidence(landmarks);
}
