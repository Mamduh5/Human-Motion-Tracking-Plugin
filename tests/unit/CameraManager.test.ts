import { afterEach, describe, expect, it, vi } from "vitest";

import { CameraManager } from "../../src/camera";

const originalNavigator = globalThis.navigator;
const originalDocument = globalThis.document;

function setGlobalProperty<TValue>(name: string, value: TValue): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value,
  });
}

function createVideoElementMock(): HTMLVideoElement {
  return {
    autoplay: false,
    muted: false,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    playsInline: false,
    srcObject: null,
    videoHeight: 720,
    videoWidth: 1280,
  } as unknown as HTMLVideoElement;
}

function createTrackMock(): MediaStreamTrack {
  return {
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
}

function createStreamMock(tracks: MediaStreamTrack[]): MediaStream {
  return {
    active: true,
    getTracks: vi.fn(() => tracks),
  } as unknown as MediaStream;
}

afterEach(() => {
  vi.restoreAllMocks();
  setGlobalProperty("navigator", originalNavigator);
  setGlobalProperty("document", originalDocument);
});

describe("CameraManager", () => {
  it("starts a camera stream with getUserMedia and an accepted video element", async () => {
    const videoElement = createVideoElementMock();
    const stream = createStreamMock([createTrackMock()]);
    const getUserMedia = vi.fn().mockResolvedValue(stream);

    setGlobalProperty("navigator", {
      mediaDevices: {
        getUserMedia,
      },
    });

    const manager = new CameraManager({
      camera: {
        deviceId: "camera-1",
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: "user",
      },
      videoElement,
    });

    await expect(manager.start()).resolves.toBe(videoElement);

    expect(getUserMedia).toHaveBeenCalledWith({
      audio: false,
      video: {
        deviceId: { exact: "camera-1" },
        facingMode: { ideal: "user" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });
    expect(videoElement.srcObject).toBe(stream);
    expect(videoElement.play).toHaveBeenCalledOnce();
    expect(manager.isRunning()).toBe(true);
  });

  it("creates a video element when one is not provided", async () => {
    const videoElement = createVideoElementMock();
    const stream = createStreamMock([]);

    setGlobalProperty("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });
    setGlobalProperty("document", {
      createElement: vi.fn(() => videoElement),
    });

    const manager = new CameraManager();

    await manager.start();

    expect(document.createElement).toHaveBeenCalledWith("video");
    expect(videoElement.autoplay).toBe(true);
    expect(videoElement.muted).toBe(true);
    expect(videoElement.playsInline).toBe(true);
    expect(manager.getVideoElement()).toBe(videoElement);
  });

  it("stops all media tracks and clears the video source", async () => {
    const firstTrack = createTrackMock();
    const secondTrack = createTrackMock();
    const videoElement = createVideoElementMock();
    const stream = createStreamMock([firstTrack, secondTrack]);

    setGlobalProperty("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    const manager = new CameraManager({ videoElement });

    await manager.start();
    manager.stop();

    expect(firstTrack.stop).toHaveBeenCalledOnce();
    expect(secondTrack.stop).toHaveBeenCalledOnce();
    expect(videoElement.pause).toHaveBeenCalledOnce();
    expect(videoElement.srcObject).toBeNull();
    expect(manager.isRunning()).toBe(false);
  });

  it("throws a clear error when camera APIs are unavailable", async () => {
    setGlobalProperty("navigator", {});

    const manager = new CameraManager({ videoElement: createVideoElementMock() });

    await expect(manager.start()).rejects.toThrow("Camera APIs are unavailable");
  });

  it("throws a clear error when it cannot create a video element", () => {
    setGlobalProperty("document", {});

    const manager = new CameraManager();

    expect(() => manager.getVideoElement()).toThrow("document.createElement is unavailable");
  });
});
