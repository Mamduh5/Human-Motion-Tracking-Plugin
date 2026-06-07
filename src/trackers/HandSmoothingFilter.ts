import type { DetectedHand, HandLandmark, HandResult } from "../types";

export interface HandSmoothingFilterOptions {
  factor?: number;
}

export class HandSmoothingFilter {
  private readonly factor: number;
  private previousLandmarks = new Map<string, HandLandmark[]>();
  private previousWorldLandmarks = new Map<string, HandLandmark[]>();

  constructor(options: HandSmoothingFilterOptions = {}) {
    this.factor = options.factor ?? 0.35;
  }

  update(result: HandResult): HandResult {
    const handednessCounts = new Map<string, number>();
    const hands = result.hands.map((hand, index) => {
      const key = getHandKey(hand, index, handednessCounts);
      const landmarks = smoothLandmarks(hand.landmarks, this.previousLandmarks.get(key), this.factor);
      const worldLandmarks = hand.worldLandmarks
        ? smoothLandmarks(hand.worldLandmarks, this.previousWorldLandmarks.get(key), this.factor)
        : undefined;

      this.previousLandmarks.set(key, landmarks);

      if (worldLandmarks) {
        this.previousWorldLandmarks.set(key, worldLandmarks);
      }

      return {
        ...hand,
        landmarks,
        worldLandmarks,
      };
    });

    return {
      ...result,
      hands,
    };
  }

  reset(): void {
    this.previousLandmarks.clear();
    this.previousWorldLandmarks.clear();
  }
}

function getHandKey(hand: DetectedHand, index: number, handednessCounts: Map<string, number>): string {
  if (hand.handedness === "unknown") {
    return `unknown-${index}`;
  }

  const count = handednessCounts.get(hand.handedness) ?? 0;
  handednessCounts.set(hand.handedness, count + 1);

  return count === 0 ? hand.handedness : `${hand.handedness}-${count}`;
}

function smoothLandmarks(current: HandLandmark[], previous: HandLandmark[] | undefined, factor: number): HandLandmark[] {
  if (!previous) {
    return current.map((landmark) => ({ ...landmark }));
  }

  return current.map((landmark) => {
    const previousLandmark = previous.find((candidate) => candidate.name === landmark.name);

    if (!previousLandmark) {
      return { ...landmark };
    }

    return {
      ...landmark,
      x: smoothValue(previousLandmark.x, landmark.x, factor),
      y: smoothValue(previousLandmark.y, landmark.y, factor),
      z: landmark.z === undefined ? undefined : smoothValue(previousLandmark.z ?? landmark.z, landmark.z, factor),
    };
  });
}

function smoothValue(previous: number, current: number, factor: number): number {
  return previous * (1 - factor) + current * factor;
}
