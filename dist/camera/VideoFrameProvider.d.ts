export interface VideoFrame {
    video: HTMLVideoElement;
    timestamp: number;
    width: number;
    height: number;
}
export type VideoFrameCallback = (frame: VideoFrame) => void;
export declare class VideoFrameProvider {
    private readonly videoElement;
    constructor(videoElement: HTMLVideoElement);
    getVideoElement(): HTMLVideoElement;
    getFrame(timestamp?: number): VideoFrame;
    requestFrame(callback: VideoFrameCallback): number;
}
//# sourceMappingURL=VideoFrameProvider.d.ts.map