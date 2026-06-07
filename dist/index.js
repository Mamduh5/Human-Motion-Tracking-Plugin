export const packageName = "human-motion-tracking-plugin";
export { CameraManager, VideoFrameProvider } from "./camera/index";
export { MotionTracker } from "./core/index";
export { SquatAnalyzer, detectArmsOpen, detectBothHandsUp, detectLeftHandUp, detectRightHandUp, detectStanding, } from "./detectors/index";
export { EventEmitter, MotionEvents } from "./events/index";
export { POSE_LANDMARK_NAMES, SmoothingFilter, calculateBodyCenter, calculateBodyScale, calculateDistance, calculateLandmarkConfidence, filterLandmarksByConfidence, filterLandmarksByVisibility, getLandmarkByName, getLandmarksByName, getPoseLandmarkName, normalizeLandmarks, smoothLandmarks, } from "./normalizers/index";
export { PluginManager, registerPlugin } from "./plugins/index";
export { HolisticTracker, PoseTracker, TrackerProvider } from "./trackers/index";
export { averageConfidence, calculateAngle, distance2D, distance3D, getTimestamp, isLandmarkVisible, landmarkDistance2D, landmarkDistance3D, } from "./utils/index";
//# sourceMappingURL=index.js.map