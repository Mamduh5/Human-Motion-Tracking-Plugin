import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

import { calculateLandmarkConfidence, normalizeLandmarks } from "../normalizers";
import type { PoseResult } from "../types";
import type { MotionLandmarkTracker, PoseTrackerConfig } from "./interfaces";

interface MediaPipeLandmarkLike {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

interface MediaPipePoseResultLike {
  landmarks: MediaPipeLandmarkLike[][];
  worldLandmarks?: MediaPipeLandmarkLike[][];
}

export function convertPoseLandmarkerResult(result: MediaPipePoseResultLike, timestamp: number): PoseResult | null {
  const landmarks = result.landmarks[0];

  if (!landmarks || landmarks.length === 0) {
    return null;
  }

  return {
    timestamp,
    landmarks: normalizeLandmarks(landmarks),
    worldLandmarks: result.worldLandmarks?.[0] ? normalizeLandmarks(result.worldLandmarks[0]) : undefined,
    confidence: calculateLandmarkConfidence(landmarks),
  };
}

export class PoseTracker implements MotionLandmarkTracker {
  #landmarker?: PoseLandmarker;

  constructor(private readonly config: PoseTrackerConfig) {}

  async initialize(): Promise<void> {
    try {
      const vision = await FilesetResolver.forVisionTasks(this.config.wasmAssetPath);

      this.#landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: this.config.modelAssetPath,
        },
        runningMode: "VIDEO",
        numPoses: this.config.numPoses ?? 1,
        minPoseDetectionConfidence: this.config.minPoseDetectionConfidence,
        minPosePresenceConfidence: this.config.minPosePresenceConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence,
        outputSegmentationMasks: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      throw new Error(
        `Failed to initialize MediaPipe Pose tracker. Check modelAssetPath and wasmAssetPath. Details: ${message}`,
      );
    }
  }

  detect(video: HTMLVideoElement, timestamp: number): PoseResult | null {
    if (!this.#landmarker) {
      throw new Error("PoseTracker has not been initialized. Call initialize() before detect().");
    }

    const result = this.#landmarker.detectForVideo(video, timestamp);

    return convertPoseLandmarkerResult(result, timestamp);
  }

  dispose(): void {
    this.#landmarker?.close();
    this.#landmarker = undefined;
  }
}
