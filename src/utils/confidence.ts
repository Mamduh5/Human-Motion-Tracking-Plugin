import type { Landmark } from "../types";

export function averageConfidence(landmarks: Pick<Landmark, "visibility">[]): number {
  const visibleValues = landmarks
    .map((landmark) => landmark.visibility)
    .filter((visibility): visibility is number => typeof visibility === "number");

  if (visibleValues.length === 0) {
    return 1;
  }

  return visibleValues.reduce((total, visibility) => total + visibility, 0) / visibleValues.length;
}

export function isLandmarkVisible(landmark: Pick<Landmark, "visibility">, minVisibility = 0.5): boolean {
  return (landmark.visibility ?? 1) >= minVisibility;
}
