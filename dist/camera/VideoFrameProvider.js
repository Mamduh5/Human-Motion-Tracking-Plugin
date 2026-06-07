export class VideoFrameProvider {
    constructor(videoElement) {
        this.videoElement = videoElement;
    }
    getVideoElement() {
        return this.videoElement;
    }
    getFrame(timestamp = performance.now()) {
        return {
            video: this.videoElement,
            timestamp,
            width: this.videoElement.videoWidth,
            height: this.videoElement.videoHeight,
        };
    }
    requestFrame(callback) {
        const requestVideoFrameCallback = this.videoElement.requestVideoFrameCallback;
        if (typeof requestVideoFrameCallback === "function") {
            return requestVideoFrameCallback.call(this.videoElement, (timestamp) => {
                callback(this.getFrame(timestamp));
            });
        }
        return requestAnimationFrame((timestamp) => {
            callback(this.getFrame(timestamp));
        });
    }
}
//# sourceMappingURL=VideoFrameProvider.js.map