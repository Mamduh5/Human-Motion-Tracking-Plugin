export type Handedness = "left" | "right" | "unknown";

export const HAND_LANDMARK_NAMES = [
  "wrist",
  "thumbCmc",
  "thumbMcp",
  "thumbIp",
  "thumbTip",
  "indexFingerMcp",
  "indexFingerPip",
  "indexFingerDip",
  "indexFingerTip",
  "middleFingerMcp",
  "middleFingerPip",
  "middleFingerDip",
  "middleFingerTip",
  "ringFingerMcp",
  "ringFingerPip",
  "ringFingerDip",
  "ringFingerTip",
  "pinkyMcp",
  "pinkyPip",
  "pinkyDip",
  "pinkyTip",
] as const;

export type HandLandmarkName = (typeof HAND_LANDMARK_NAMES)[number];

export interface HandLandmark {
  name: HandLandmarkName;
  index: number;
  x: number;
  y: number;
  z?: number;
}

export interface DetectedHand {
  handedness: Handedness;
  handednessScore: number;
  landmarks: HandLandmark[];
  worldLandmarks?: HandLandmark[];
}

export interface HandResult {
  timestamp: number;
  hands: DetectedHand[];
  confidence: number;
}
