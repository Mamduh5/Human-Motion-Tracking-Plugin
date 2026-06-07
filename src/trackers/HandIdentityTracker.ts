import type { DetectedHand, HandLandmark, HandResult, Handedness } from "../types";

const SAME_HANDEDNESS_DISTANCE = 0.18;
const FLICKER_DISTANCE = 0.08;

interface PreviousHand {
  handedness: Handedness;
  position: Point2D;
}

interface Point2D {
  x: number;
  y: number;
}

export class HandIdentityTracker {
  private previousHands: PreviousHand[] = [];

  update(result: HandResult): HandResult {
    if (this.previousHands.length === 0 || result.hands.length === 0) {
      this.previousHands = result.hands.map(createPreviousHand);
      return cloneHandResult(result);
    }

    const usedPreviousIndexes = new Set<number>();
    const updatedHands = result.hands.map((hand) => {
      const currentPosition = getHandPosition(hand);
      const sameHandedPrevious = findClosestPreviousHand(
        this.previousHands,
        currentPosition,
        usedPreviousIndexes,
        hand.handedness,
        SAME_HANDEDNESS_DISTANCE,
      );

      if (sameHandedPrevious) {
        usedPreviousIndexes.add(sameHandedPrevious.index);
        return cloneHand(hand);
      }

      const closestPrevious = findClosestPreviousHand(
        this.previousHands,
        currentPosition,
        usedPreviousIndexes,
        undefined,
        FLICKER_DISTANCE,
      );

      if (
        closestPrevious &&
        closestPrevious.hand.handedness !== "unknown" &&
        hand.handedness !== "unknown" &&
        closestPrevious.hand.handedness !== hand.handedness
      ) {
        usedPreviousIndexes.add(closestPrevious.index);
        return {
          ...cloneHand(hand),
          handedness: closestPrevious.hand.handedness,
        };
      }

      return cloneHand(hand);
    });

    const updatedResult = {
      ...result,
      hands: updatedHands,
      confidence: getAverageHandConfidence(updatedHands),
    };

    this.previousHands = updatedHands.map(createPreviousHand);

    return updatedResult;
  }

  reset(): void {
    this.previousHands = [];
  }
}

function findClosestPreviousHand(
  previousHands: PreviousHand[],
  position: Point2D,
  usedIndexes: Set<number>,
  handedness: Handedness | undefined,
  maxDistance: number,
): { hand: PreviousHand; index: number; distance: number } | undefined {
  let closest: { hand: PreviousHand; index: number; distance: number } | undefined;

  previousHands.forEach((hand, index) => {
    if (usedIndexes.has(index) || (handedness && hand.handedness !== handedness)) {
      return;
    }

    const distance = distance2D(position, hand.position);

    if (distance <= maxDistance && (!closest || distance < closest.distance)) {
      closest = {
        hand,
        index,
        distance,
      };
    }
  });

  return closest;
}

function createPreviousHand(hand: DetectedHand): PreviousHand {
  return {
    handedness: hand.handedness,
    position: getHandPosition(hand),
  };
}

function getHandPosition(hand: DetectedHand): Point2D {
  const palmLandmarks = ["wrist", "indexFingerMcp", "middleFingerMcp", "ringFingerMcp", "pinkyMcp"];
  const points = palmLandmarks
    .map((name) => hand.landmarks.find((landmark) => landmark.name === name))
    .filter((landmark): landmark is HandLandmark => Boolean(landmark));

  if (points.length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: points.reduce((sum, landmark) => sum + landmark.x, 0) / points.length,
    y: points.reduce((sum, landmark) => sum + landmark.y, 0) / points.length,
  };
}

function cloneHandResult(result: HandResult): HandResult {
  return {
    ...result,
    hands: result.hands.map(cloneHand),
  };
}

function cloneHand(hand: DetectedHand): DetectedHand {
  return {
    ...hand,
    landmarks: hand.landmarks.map((landmark) => ({ ...landmark })),
    worldLandmarks: hand.worldLandmarks?.map((landmark) => ({ ...landmark })),
  };
}

function getAverageHandConfidence(hands: DetectedHand[]): number {
  const scores = hands.map((hand) => hand.handednessScore).filter((score) => Number.isFinite(score) && score > 0);

  return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}

function distance2D(firstPoint: Point2D, secondPoint: Point2D): number {
  const deltaX = secondPoint.x - firstPoint.x;
  const deltaY = secondPoint.y - firstPoint.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}
