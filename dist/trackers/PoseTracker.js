var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _PoseTracker_landmarker;
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { calculateLandmarkConfidence, normalizeLandmarks } from "../normalizers";
export function convertPoseLandmarkerResult(result, timestamp) {
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
export class PoseTracker {
    constructor(config) {
        this.config = config;
        _PoseTracker_landmarker.set(this, void 0);
    }
    async initialize() {
        try {
            const vision = await FilesetResolver.forVisionTasks(this.config.wasmAssetPath);
            __classPrivateFieldSet(this, _PoseTracker_landmarker, await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: this.config.modelAssetPath,
                },
                runningMode: "VIDEO",
                numPoses: this.config.numPoses ?? 1,
                minPoseDetectionConfidence: this.config.minPoseDetectionConfidence,
                minPosePresenceConfidence: this.config.minPosePresenceConfidence,
                minTrackingConfidence: this.config.minTrackingConfidence,
                outputSegmentationMasks: false,
            }), "f");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to initialize MediaPipe Pose tracker. Check modelAssetPath and wasmAssetPath. Details: ${message}`);
        }
    }
    detect(video, timestamp) {
        if (!__classPrivateFieldGet(this, _PoseTracker_landmarker, "f")) {
            throw new Error("PoseTracker has not been initialized. Call initialize() before detect().");
        }
        const result = __classPrivateFieldGet(this, _PoseTracker_landmarker, "f").detectForVideo(video, timestamp);
        return convertPoseLandmarkerResult(result, timestamp);
    }
    dispose() {
        __classPrivateFieldGet(this, _PoseTracker_landmarker, "f")?.close();
        __classPrivateFieldSet(this, _PoseTracker_landmarker, undefined, "f");
    }
}
_PoseTracker_landmarker = new WeakMap();
//# sourceMappingURL=PoseTracker.js.map