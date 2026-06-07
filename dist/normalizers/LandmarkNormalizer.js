import { averageConfidence, isLandmarkVisible } from "../utils";
export const POSE_LANDMARK_NAMES = [
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
];
export function getPoseLandmarkName(index) {
    return POSE_LANDMARK_NAMES[index] ?? `landmark-${index}`;
}
export function normalizeLandmarks(landmarks) {
    return landmarks.map((landmark, index) => ({
        name: landmark.name ?? getPoseLandmarkName(index),
        index: landmark.index ?? index,
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility,
    }));
}
export function getLandmarkByName(landmarks, name) {
    return landmarks.find((landmark) => landmark.name === name);
}
export function getLandmarksByName(landmarks, names) {
    const requestedNames = new Set(names);
    return landmarks.filter((landmark) => requestedNames.has(landmark.name));
}
export function filterLandmarksByVisibility(landmarks, minVisibility) {
    return landmarks.filter((landmark) => isLandmarkVisible(landmark, minVisibility));
}
export function filterLandmarksByConfidence(landmarks, minConfidence) {
    return filterLandmarksByVisibility(landmarks, minConfidence);
}
export function calculateLandmarkConfidence(landmarks) {
    return averageConfidence(landmarks);
}
//# sourceMappingURL=LandmarkNormalizer.js.map