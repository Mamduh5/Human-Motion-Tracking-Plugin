import { HolisticTracker } from "./HolisticTracker";
import { PoseTracker } from "./PoseTracker";
export class TrackerProvider {
    static create(config) {
        if (config.mode === "pose") {
            if (!config.pose) {
                throw new Error("TrackerProviderConfig.pose is required for pose tracking.");
            }
            return new PoseTracker(config.pose);
        }
        if (config.mode === "holistic") {
            return new HolisticTracker(config.holistic);
        }
        throw new Error(`Unsupported tracker mode: ${String(config.mode)}`);
    }
}
//# sourceMappingURL=TrackerProvider.js.map