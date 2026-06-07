import type { CameraSource, CameraSourceOptions } from "./CameraSource";
export declare class CameraManager implements CameraSource {
    private readonly camera?;
    private readonly constraints?;
    private videoElement?;
    private stream?;
    constructor(options?: CameraSourceOptions);
    start(): Promise<HTMLVideoElement>;
    stop(): void;
    getVideoElement(): HTMLVideoElement;
    isRunning(): boolean;
    private getMediaDevices;
    private getOrCreateVideoElement;
    private buildConstraints;
    private buildVideoConstraints;
}
//# sourceMappingURL=CameraManager.d.ts.map