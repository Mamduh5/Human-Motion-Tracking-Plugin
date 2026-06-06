import type { Landmark } from "../types";
import { distance2D } from "../utils";
import { getLandmarkByName } from "./LandmarkNormalizer";

export interface Point2D {
  x: number;
  y: number;
}

export function calculateBodyCenter(landmarks: Landmark[]): Point2D | null {
  return averagePoints([
    getLandmarkByName(landmarks, "leftShoulder"),
    getLandmarkByName(landmarks, "rightShoulder"),
    getLandmarkByName(landmarks, "leftHip"),
    getLandmarkByName(landmarks, "rightHip"),
  ]);
}

export function calculateBodyScale(landmarks: Landmark[]): number | null {
  const leftShoulder = getLandmarkByName(landmarks, "leftShoulder");
  const rightShoulder = getLandmarkByName(landmarks, "rightShoulder");

  if (leftShoulder && rightShoulder) {
    return calculateDistance(leftShoulder, rightShoulder);
  }

  const shoulderCenter = averagePoints([leftShoulder, rightShoulder]);
  const hipCenter = averagePoints([getLandmarkByName(landmarks, "leftHip"), getLandmarkByName(landmarks, "rightHip")]);

  if (!shoulderCenter || !hipCenter) {
    return null;
  }

  return calculateDistance(shoulderCenter, hipCenter);
}

export function calculateDistance(firstPoint: Point2D, secondPoint: Point2D): number {
  return distance2D(firstPoint, secondPoint);
}

function averagePoints(points: Array<Point2D | undefined>): Point2D | null {
  const validPoints = points.filter((point): point is Point2D => Boolean(point));

  if (validPoints.length === 0) {
    return null;
  }

  return {
    x: validPoints.reduce((total, point) => total + point.x, 0) / validPoints.length,
    y: validPoints.reduce((total, point) => total + point.y, 0) / validPoints.length,
  };
}
