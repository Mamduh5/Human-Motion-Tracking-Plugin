export class HolisticTracker {
    constructor(_config = {}) {
        this._config = _config;
    }
    async initialize() {
        throw new Error("HolisticTracker is not implemented yet.");
    }
    detect(_video, _timestamp) {
        throw new Error("HolisticTracker is not implemented yet.");
    }
    dispose() {
        // No resources are allocated until holistic tracking is implemented.
    }
}
//# sourceMappingURL=HolisticTracker.js.map