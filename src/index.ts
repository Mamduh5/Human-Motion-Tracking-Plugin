export const packageName = "human-motion-tracking-plugin";

export { CameraManager, VideoFrameProvider } from "./camera/index";
export type { CameraSource, CameraSourceOptions, VideoFrame, VideoFrameCallback } from "./camera/index";
export { MotionTracker } from "./core/index";
export type { MotionTrackerDependencies, MotionTrackerState, MotionTrackerStatus, ResolvedMotionTrackerConfig } from "./core/index";
export {
  SquatAnalyzer,
  detectArmsCrossed,
  detectArmsOpen,
  detectArmsUp,
  detectBothHandsUp,
  detectHandsOnHips,
  detectHandUp,
  detectLeftArmExtended,
  detectLeftElbowBent,
  detectLeftHandUp,
  detectRightArmExtended,
  detectRightElbowBent,
  detectRightHandUp,
  detectStanding,
} from "./detectors/index";
export type { SquatAnalyzerOptions, SquatStage } from "./detectors/index";
export { EventEmitter, MotionEvents } from "./events/index";
export type { EventHandler, EventMap, MotionEventName, MotionEventPayload } from "./events/index";
export {
  POSE_LANDMARK_NAMES,
  SmoothingFilter,
  calculateBodyCenter,
  calculateBodyScale,
  calculateDistance,
  calculateLandmarkConfidence,
  filterLandmarksByConfidence,
  filterLandmarksByVisibility,
  getLandmarkByName,
  getLandmarksByName,
  getPoseLandmarkName,
  normalizeLandmarks,
  smoothLandmarks,
} from "./normalizers/index";
export type { Point2D, PoseLandmarkName, SmoothingFilterOptions, UnnamedLandmark } from "./normalizers/index";
export { PluginManager, registerPlugin } from "./plugins/index";
export type { MotionPlugin, MotionPluginApi } from "./plugins/index";
export { HolisticTracker, PoseTracker, TrackerProvider } from "./trackers/index";
export type {
  HolisticTrackerConfig,
  MotionLandmarkTracker,
  PoseTrackerConfig,
  TrackerProviderConfig,
  TrackerProviderMode,
} from "./trackers/index";
export type * from "./types/index";
export {
  averageConfidence,
  calculateAngle,
  distance2D,
  distance3D,
  getTimestamp,
  isLandmarkVisible,
  landmarkDistance2D,
  landmarkDistance3D,
} from "./utils/index";
export type { Point3D } from "./utils/index";
