export interface Landmark {
  name: string;
  index: number;
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PoseResult {
  timestamp: number;
  landmarks: Landmark[];
  worldLandmarks?: Landmark[];
  confidence: number;
}
