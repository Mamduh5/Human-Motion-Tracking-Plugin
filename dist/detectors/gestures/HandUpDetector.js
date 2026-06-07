import { getLandmarkByName } from "../../normalizers";
import { averageConfidence, isLandmarkVisible } from "../../utils";
const MIN_VISIBILITY = 0.5;
export function detectLeftHandUp(pose) {
    return detectHandUp(pose, "left");
}
export function detectRightHandUp(pose) {
    return detectHandUp(pose, "right");
}
export function detectBothHandsUp(pose) {
    const left = getRequiredLandmarks(pose, "left");
    const right = getRequiredLandmarks(pose, "right");
    const landmarks = [left.wrist, left.shoulder, right.wrist, right.shoulder].filter((landmark) => Boolean(landmark));
    if (!left.wrist || !left.shoulder || !right.wrist || !right.shoulder) {
        return createGestureResult("bothHandsUp", pose.timestamp, false, 0, { reason: "missing-landmarks" });
    }
    const leftActive = isWristAboveShoulder(left.wrist, left.shoulder);
    const rightActive = isWristAboveShoulder(right.wrist, right.shoulder);
    return createGestureResult("bothHandsUp", pose.timestamp, leftActive && rightActive, averageConfidence(landmarks));
}
function detectHandUp(pose, side) {
    const { wrist, shoulder } = getRequiredLandmarks(pose, side);
    const name = side === "left" ? "leftHandUp" : "rightHandUp";
    if (!wrist || !shoulder) {
        return createGestureResult(name, pose.timestamp, false, 0, { reason: "missing-landmarks" });
    }
    const landmarks = [wrist, shoulder];
    const visible = landmarks.every((landmark) => isLandmarkVisible(landmark, MIN_VISIBILITY));
    return createGestureResult(name, pose.timestamp, visible && isWristAboveShoulder(wrist, shoulder), averageConfidence(landmarks));
}
function getRequiredLandmarks(pose, side) {
    return {
        wrist: getLandmarkByName(pose.landmarks, `${side}Wrist`),
        shoulder: getLandmarkByName(pose.landmarks, `${side}Shoulder`),
    };
}
function isWristAboveShoulder(wrist, shoulder) {
    return wrist.y < shoulder.y;
}
function createGestureResult(name, timestamp, active, confidence, metadata) {
    return {
        name,
        active,
        confidence,
        timestamp,
        metadata,
    };
}
//# sourceMappingURL=HandUpDetector.js.map