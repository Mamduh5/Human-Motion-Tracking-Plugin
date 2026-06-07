export class CameraManager {
    constructor(options = {}) {
        this.camera = options.camera;
        this.constraints = options.constraints;
        this.videoElement = options.videoElement;
    }
    async start() {
        const mediaDevices = this.getMediaDevices();
        const videoElement = this.getOrCreateVideoElement();
        this.stream = await mediaDevices.getUserMedia(this.buildConstraints());
        videoElement.srcObject = this.stream;
        if (typeof videoElement.play === "function") {
            await videoElement.play();
        }
        return videoElement;
    }
    stop() {
        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
        }
        if (this.videoElement) {
            this.videoElement.pause();
            this.videoElement.srcObject = null;
        }
        this.stream = undefined;
    }
    getVideoElement() {
        return this.getOrCreateVideoElement();
    }
    isRunning() {
        return Boolean(this.stream?.active);
    }
    getMediaDevices() {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            throw new Error("Camera APIs are unavailable. This SDK requires navigator.mediaDevices.getUserMedia in a browser context.");
        }
        return navigator.mediaDevices;
    }
    getOrCreateVideoElement() {
        if (this.videoElement) {
            return this.videoElement;
        }
        if (typeof document === "undefined" || typeof document.createElement !== "function") {
            throw new Error("Camera video element cannot be created because document.createElement is unavailable.");
        }
        const videoElement = document.createElement("video");
        videoElement.autoplay = true;
        videoElement.muted = true;
        videoElement.playsInline = true;
        this.videoElement = videoElement;
        return videoElement;
    }
    buildConstraints() {
        if (this.constraints) {
            return this.constraints;
        }
        return {
            audio: false,
            video: this.buildVideoConstraints(),
        };
    }
    buildVideoConstraints() {
        if (!this.camera) {
            return true;
        }
        const constraints = {};
        if (this.camera.deviceId) {
            constraints.deviceId = { exact: this.camera.deviceId };
        }
        if (this.camera.facingMode) {
            constraints.facingMode = { ideal: this.camera.facingMode };
        }
        if (this.camera.width) {
            constraints.width = { ideal: this.camera.width };
        }
        if (this.camera.height) {
            constraints.height = { ideal: this.camera.height };
        }
        if (this.camera.frameRate) {
            constraints.frameRate = { ideal: this.camera.frameRate };
        }
        return constraints;
    }
}
//# sourceMappingURL=CameraManager.js.map