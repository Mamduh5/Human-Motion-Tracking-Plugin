import { getLandmarkByName } from "../../normalizers";
import { averageConfidence, distance2D, isLandmarkVisible } from "../../utils";
const MIN_VISIBILITY = 0.5;
const MAX_WRIST_SHOULDER_Y_DELTA_RATIO = 0.4;
export function detectArmsOpen(pose) {
    const leftShoulder = getLandmarkByName(pose.landmarks, "leftShoulder");
    const rightShoulder = getLandmarkByName(pose.landmarks, "rightShoulder");
    const leftWrist = getLandmarkByName(pose.landmarks, "leftWrist");
    const rightWrist = getLandmarkByName(pose.landmarks, "rightWrist");
    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
        return createGestureResult(pose.timestamp, false, 0, { reason: "missing-landmarks" });
    }
    const landmarks = [leftShoulder, rightShoulder, leftWrist, rightWrist];
    const shoulderWidth = distance2D(leftShoulder, rightShoulder);
    if (shoulderWidth === 0 || !landmarks.every((landmark) => isLandmarkVisible(landmark, MIN_VISIBILITY))) {
        return createGestureResult(pose.timestamp, false, averageConfidence(landmarks));
    }
    const leftExtended = leftWrist.x < leftShoulder.x;
    const rightExtended = rightWrist.x > rightShoulder.x;
    const leftLevel = isNearShoulderHeight(leftWrist, leftShoulder, shoulderWidth);
    const rightLevel = isNearShoulderHeight(rightWrist, rightShoulder, shoulderWidth);
    return createGestureResult(pose.timestamp, leftExtended && rightExtended && leftLevel && rightLevel, averageConfidence(landmarks), {
        shoulderWidth,
    });
}
function isNearShoulderHeight(wrist, shoulder, shoulderWidth) {
    return Math.abs(wrist.y - shoulder.y) <= shoulderWidth * MAX_WRIST_SHOULDER_Y_DELTA_RATIO;
}
function createGestureResult(timestamp, active, confidence, metadata) {
    return {
        name: "armsOpen",
        active,
        confidence,
        timestamp,
        metadata,
    };
}
//# sourceMappingURL=ArmsOpenDetector.js.map