export function smoothLandmarks(currentLandmarks, previousLandmarks, alpha = 0.35) {
    const clampedAlpha = clampAlpha(alpha);
    const previousByIndex = new Map(previousLandmarks.map((landmark) => [landmark.index, landmark]));
    return currentLandmarks.map((currentLandmark) => {
        const previousLandmark = previousByIndex.get(currentLandmark.index);
        if (!previousLandmark) {
            return { ...currentLandmark };
        }
        return smoothLandmark(currentLandmark, previousLandmark, clampedAlpha);
    });
}
export class SmoothingFilter {
    constructor(options = {}) {
        this.previousLandmarks = [];
        this.alpha = clampAlpha(options.alpha ?? 0.35);
    }
    apply(landmarks) {
        const smoothedLandmarks = smoothLandmarks(landmarks, this.previousLandmarks, this.alpha);
        this.previousLandmarks = smoothedLandmarks;
        return smoothedLandmarks;
    }
    reset() {
        this.previousLandmarks = [];
    }
}
function smoothLandmark(currentLandmark, previousLandmark, alpha) {
    return {
        ...currentLandmark,
        x: smoothValue(currentLandmark.x, previousLandmark.x, alpha),
        y: smoothValue(currentLandmark.y, previousLandmark.y, alpha),
        z: smoothOptionalValue(currentLandmark.z, previousLandmark.z, alpha),
        visibility: smoothOptionalValue(currentLandmark.visibility, previousLandmark.visibility, alpha),
    };
}
function smoothValue(currentValue, previousValue, alpha) {
    return previousValue + alpha * (currentValue - previousValue);
}
function smoothOptionalValue(currentValue, previousValue, alpha) {
    if (currentValue === undefined) {
        return undefined;
    }
    if (previousValue === undefined) {
        return currentValue;
    }
    return smoothValue(currentValue, previousValue, alpha);
}
function clampAlpha(alpha) {
    return Math.min(1, Math.max(0, alpha));
}
//# sourceMappingURL=SmoothingFilter.js.map