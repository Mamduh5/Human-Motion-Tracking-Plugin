import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

import type { Landmark, PoseResult } from "../types";
import type { MotionLandmarkTracker, PoseTrackerConfig } from "./interfaces";

const POSE_LANDMARK_NAMES = [
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
    landmarks: convertLandmarks(landmarks),
    worldLandmarks: result.worldLandmarks?.[0] ? convertLandmarks(result.worldLandmarks[0]) : undefined,
    confidence: calculateConfidence(landmarks),
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

function convertLandmarks(landmarks: MediaPipeLandmarkLike[]): Landmark[] {
  return landmarks.map((landmark, index) => ({
    name: POSE_LANDMARK_NAMES[index] ?? `landmark-${index}`,
    index,
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
  }));
}

function calculateConfidence(landmarks: MediaPipeLandmarkLike[]): number {
  const visibilityValues = landmarks
    .map((landmark) => landmark.visibility)
    .filter((visibility): visibility is number => typeof visibility === "number");

  if (visibilityValues.length === 0) {
    return 1;
  }

  const totalVisibility = visibilityValues.reduce((total, visibility) => total + visibility, 0);

  return totalVisibility / visibilityValues.length;
}
