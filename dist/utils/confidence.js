export function averageConfidence(landmarks) {
    const visibleValues = landmarks
        .map((landmark) => landmark.visibility)
        .filter((visibility) => typeof visibility === "number");
    if (visibleValues.length === 0) {
        return 1;
    }
    return visibleValues.reduce((total, visibility) => total + visibility, 0) / visibleValues.length;
}
export function isLandmarkVisible(landmark, minVisibility = 0.5) {
    return (landmark.visibility ?? 1) >= minVisibility;
}
//# sourceMappingURL=confidence.js.map