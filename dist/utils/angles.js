export function calculateAngle(a, b, c) {
    const vectorBA = {
        x: a.x - b.x,
        y: a.y - b.y,
    };
    const vectorBC = {
        x: c.x - b.x,
        y: c.y - b.y,
    };
    const magnitudeBA = Math.sqrt(vectorBA.x * vectorBA.x + vectorBA.y * vectorBA.y);
    const magnitudeBC = Math.sqrt(vectorBC.x * vectorBC.x + vectorBC.y * vectorBC.y);
    if (magnitudeBA === 0 || magnitudeBC === 0) {
        return 0;
    }
    const cosine = (vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y) / (magnitudeBA * magnitudeBC);
    const clampedCosine = Math.min(1, Math.max(-1, cosine));
    return (Math.acos(clampedCosine) * 180) / Math.PI;
}
//# sourceMappingURL=angles.js.map