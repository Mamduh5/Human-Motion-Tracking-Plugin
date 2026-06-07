import type { Landmark } from "../types";

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D extends Point2D {
  z?: number;
}

export function distance2D(firstPoint: Point2D, secondPoint: Point2D): number {
  const deltaX = secondPoint.x - firstPoint.x;
  const deltaY = secondPoint.y - firstPoint.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

export function distance3D(firstPoint: Point3D, secondPoint: Point3D): number {
  const deltaX = secondPoint.x - firstPoint.x;
  const deltaY = secondPoint.y - firstPoint.y;
  const deltaZ = (secondPoint.z ?? 0) - (firstPoint.z ?? 0);

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
}

export function landmarkDistance2D(firstLandmark: Landmark, secondLandmark: Landmark): number {
  return distance2D(firstLandmark, secondLandmark);
}

export function landmarkDistance3D(firstLandmark: Landmark, secondLandmark: Landmark): number {
  return distance3D(firstLandmark, secondLandmark);
}
