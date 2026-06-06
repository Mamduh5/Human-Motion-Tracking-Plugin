export const packageName = "human-motion-tracking-plugin";

export type TrackingStatus = "idle";

export interface CameraSourceOptions {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface HumanMotionTrackingPluginOptions {
  camera?: CameraSourceOptions;
}

export interface HumanMotionTrackingPlugin {
  status: TrackingStatus;
}
