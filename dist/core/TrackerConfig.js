export function resolveMotionTrackerConfig(config) {
    if (config.mode !== "pose") {
        throw new Error("Only pose tracking is currently supported. Holistic tracking is not implemented yet.");
    }
    if (!config.pose?.modelAssetPath) {
        throw new Error("MotionTrackerConfig.pose.modelAssetPath is required for pose tracking.");
    }
    if (!config.pose.wasmAssetPath) {
        throw new Error("MotionTrackerConfig.pose.wasmAssetPath is required for pose tracking.");
    }
    return config;
}
//# sourceMappingURL=TrackerConfig.js.map