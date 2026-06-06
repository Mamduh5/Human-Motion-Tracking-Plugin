import { getLandmarkByName } from "../../normalizers";
import type { GestureResult, Landmark, PoseResult } from "../../types";
import { averageConfidence, isLandmarkVisible } from "../../utils";

const MIN_VISIBILITY = 0.5;

export function detectStanding(pose: PoseResult): GestureResult {
  const leftChain = getBodySideLandmarks(pose, "left");
  const rightChain = getBodySideLandmarks(pose, "right");
  const availableChains = [leftChain, rightChain].filter(hasFullChain);

  if (availableChains.length === 0) {
    return {
      name: "standing",
      active: false,
      confidence: 0,
      timestamp: pose.timestamp,
      metadata: { reason: "missing-landmarks" },
    };
  }

  const landmarks = availableChains.flatMap((chain) => [chain.shoulder, chain.hip, chain.knee, chain.ankle]);
  const visible = landmarks.every((landmark) => isLandmarkVisible(landmark, MIN_VISIBILITY));
  const aligned = availableChains.every((chain) => chain.shoulder.y < chain.hip.y && chain.hip.y < chain.knee.y && chain.knee.y < chain.ankle.y);

  return {
    name: "standing",
    active: visible && aligned,
    confidence: averageConfidence(landmarks),
    timestamp: pose.timestamp,
  };
}

interface BodySideLandmarks {
  shoulder?: Landmark;
  hip?: Landmark;
  knee?: Landmark;
  ankle?: Landmark;
}

interface RequiredBodySideLandmarks {
  shoulder: Landmark;
  hip: Landmark;
  knee: Landmark;
  ankle: Landmark;
}

function getBodySideLandmarks(pose: PoseResult, side: "left" | "right"): BodySideLandmarks {
  return {
    shoulder: getLandmarkByName(pose.landmarks, `${side}Shoulder`),
    hip: getLandmarkByName(pose.landmarks, `${side}Hip`),
    knee: getLandmarkByName(pose.landmarks, `${side}Knee`),
    ankle: getLandmarkByName(pose.landmarks, `${side}Ankle`),
  };
}

function hasFullChain(chain: BodySideLandmarks): chain is RequiredBodySideLandmarks {
  return Boolean(chain.shoulder && chain.hip && chain.knee && chain.ankle);
}
