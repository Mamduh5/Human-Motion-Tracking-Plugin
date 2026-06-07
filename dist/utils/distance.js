export function distance2D(firstPoint, secondPoint) {
    const deltaX = secondPoint.x - firstPoint.x;
    const deltaY = secondPoint.y - firstPoint.y;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}
export function distance3D(firstPoint, secondPoint) {
    const deltaX = secondPoint.x - firstPoint.x;
    const deltaY = secondPoint.y - firstPoint.y;
    const deltaZ = (secondPoint.z ?? 0) - (firstPoint.z ?? 0);
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
}
export function landmarkDistance2D(firstLandmark, secondLandmark) {
    return distance2D(firstLandmark, secondLandmark);
}
export function landmarkDistance3D(firstLandmark, secondLandmark) {
    return distance3D(firstLandmark, secondLandmark);
}
//# sourceMappingURL=distance.js.map