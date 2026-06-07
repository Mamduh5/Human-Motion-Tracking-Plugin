import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

import { HAND_LANDMARK_NAMES, type DetectedHand, type HandLandmark, type HandResult, type Handedness } from "../types";
import type { HandLandmarkTracker, HandTrackerConfig } from "./interfaces";

interface MediaPipeHandLandmarkLike {
  x: number;
  y: number;
  z?: number;
}

interface MediaPipeCategoryLike {
  categoryName?: string;
  displayName?: string;
  score?: number;
}

interface MediaPipeHandResultLike {
  landmarks: MediaPipeHandLandmarkLike[][];
  worldLandmarks?: MediaPipeHandLandmarkLike[][];
  handednesses?: MediaPipeCategoryLike[][];
  handedness?: MediaPipeCategoryLike[][];
}

export function convertHandLandmarkerResult(result: MediaPipeHandResultLike, timestamp: number): HandResult | null {
  if (!result.landmarks || result.landmarks.length === 0) {
    return null;
  }

  const hands: DetectedHand[] = [];

  result.landmarks.forEach((landmarks, index) => {
    if (!landmarks || landmarks.length === 0) {
      return;
    }

    const category = getHandednessCategory(result, index);
    const worldLandmarks = result.worldLandmarks?.[index];
    const hand: DetectedHand = {
      handedness: normalizeHandedness(category?.categoryName ?? category?.displayName),
      handednessScore: category?.score ?? 0,
      landmarks: normalizeHandLandmarks(landmarks),
    };

    if (worldLandmarks) {
      hand.worldLandmarks = normalizeHandLandmarks(worldLandmarks);
    }

    hands.push(hand);
  });

  if (hands.length === 0) {
    return null;
  }

  return {
    timestamp,
    hands,
    confidence: getAverageHandConfidence(hands),
  };
}

export class HandTracker implements HandLandmarkTracker {
  #landmarker?: HandLandmarker;

  constructor(private readonly config: HandTrackerConfig) {}

  async initialize(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(this.config.wasmAssetPath);

      this.#landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: this.config.modelAssetPath,
        },
        runningMode: "VIDEO",
        numHands: this.config.numHands ?? 2,
        minHandDetectionConfidence: this.config.minHandDetectionConfidence,
        minHandPresenceConfidence: this.config.minHandPresenceConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(
        `Failed to initialize MediaPipe Hand tracker. Check modelAssetPath and wasmAssetPath. Details: ${message}`,
      );
    }
  }

  detect(video: HTMLVideoElement, timestamp: number): HandResult | null {
    if (!this.#landmarker) {
      throw new Error("HandTracker has not been initialized. Call initialize() before detect().");
    }

    const result = this.#landmarker.detectForVideo(video, timestamp);

    return convertHandLandmarkerResult(result, timestamp);
  }

  dispose(): void {
    this.#landmarker?.close();
    this.#landmarker = undefined;
  }
}

function normalizeHandLandmarks(landmarks: MediaPipeHandLandmarkLike[]): HandLandmark[] {
  return landmarks.map((landmark, index) => ({
    name: HAND_LANDMARK_NAMES[index] ?? "wrist",
    index,
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
  }));
}

function getHandednessCategory(result: MediaPipeHandResultLike, index: number): MediaPipeCategoryLike | undefined {
  return result.handednesses?.[index]?.[0] ?? result.handedness?.[index]?.[0];
}

function normalizeHandedness(value: string | undefined): Handedness {
  if (value === "Left") {
    return "left";
  }

  if (value === "Right") {
    return "right";
  }

  return "unknown";
}

function getAverageHandConfidence(hands: DetectedHand[]): number {
  const scores = hands.map((hand) => hand.handednessScore).filter((score) => Number.isFinite(score) && score > 0);

  return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
}
