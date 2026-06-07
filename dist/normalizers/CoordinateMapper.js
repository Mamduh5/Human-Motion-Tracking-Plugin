import { distance2D } from "../utils";
import { getLandmarkByName } from "./LandmarkNormalizer";
export function calculateBodyCenter(landmarks) {
    return averagePoints([
        getLandmarkByName(landmarks, "leftShoulder"),
        getLandmarkByName(landmarks, "rightShoulder"),
        getLandmarkByName(landmarks, "leftHip"),
        getLandmarkByName(landmarks, "rightHip"),
    ]);
}
export function calculateBodyScale(landmarks) {
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
export function calculateDistance(firstPoint, secondPoint) {
    return distance2D(firstPoint, secondPoint);
}
function averagePoints(points) {
    const validPoints = points.filter((point) => Boolean(point));
    if (validPoints.length === 0) {
        return null;
    }
    return {
        x: validPoints.reduce((total, point) => total + point.x, 0) / validPoints.length,
        y: validPoints.reduce((total, point) => total + point.y, 0) / validPoints.length,
    };
}
//# sourceMappingURL=CoordinateMapper.js.map