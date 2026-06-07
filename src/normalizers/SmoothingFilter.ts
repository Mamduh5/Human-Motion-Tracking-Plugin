import type { Landmark } from "../types";

export interface SmoothingFilterOptions {
  alpha?: number;
}

export function smoothLandmarks(currentLandmarks: Landmark[], previousLandmarks: Landmark[], alpha = 0.35): Landmark[] {
  const clampedAlpha = clampAlpha(alpha);
  const previousByIndex = new Map(previousLandmarks.map((landmark) => [landmark.index, landmark]));

  return currentLandmarks.map((currentLandmark) => {
    const previousLandmark = previousByIndex.get(currentLandmark.index);

    if (!previousLandmark) {
      return { ...currentLandmark };
    }

    return smoothLandmark(currentLandmark, previousLandmark, clampedAlpha);
  });
}

export class SmoothingFilter {
  private previousLandmarks: Landmark[] = [];
  private readonly alpha: number;

  constructor(options: SmoothingFilterOptions = {}) {
    this.alpha = clampAlpha(options.alpha ?? 0.35);
  }

  apply(landmarks: Landmark[]): Landmark[] {
    const smoothedLandmarks = smoothLandmarks(landmarks, this.previousLandmarks, this.alpha);
    this.previousLandmarks = smoothedLandmarks;

    return smoothedLandmarks;
  }

  reset(): void {
    this.previousLandmarks = [];
  }
}

function smoothLandmark(currentLandmark: Landmark, previousLandmark: Landmark, alpha: number): Landmark {
  return {
    ...currentLandmark,
    x: smoothValue(currentLandmark.x, previousLandmark.x, alpha),
    y: smoothValue(currentLandmark.y, previousLandmark.y, alpha),
    z: smoothOptionalValue(currentLandmark.z, previousLandmark.z, alpha),
    visibility: smoothOptionalValue(currentLandmark.visibility, previousLandmark.visibility, alpha),
  };
}

function smoothValue(currentValue: number, previousValue: number, alpha: number): number {
  return previousValue + alpha * (currentValue - previousValue);
}

function smoothOptionalValue(currentValue: number | undefined, previousValue: number | undefined, alpha: number): number | undefined {
  if (currentValue === undefined) {
    return undefined;
  }

  if (previousValue === undefined) {
    return currentValue;
  }

  return smoothValue(currentValue, previousValue, alpha);
}

function clampAlpha(alpha: number): number {
  return Math.min(1, Math.max(0, alpha));
}
