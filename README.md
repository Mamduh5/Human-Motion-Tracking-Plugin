# Human Motion Tracking Plugin

A reusable TypeScript SDK package for browser-based, camera-powered human pose tracking.

This package is intended to provide a public plugin entry point for camera-based motion and pose tracking workflows, including gesture detection, exercise movement analysis, and browser integrations.

The SDK provides a browser camera layer, a MediaPipe Pose tracker wrapper, landmark utilities, basic gesture detectors, and a main `MotionTracker` orchestration class.

## Scripts

- `npm run build` compiles the TypeScript library into `dist/`.
- `npm test` runs the Vitest test suite.
- `npm run dev` starts a Vite dev server rooted at `examples/`.
- `npm run dev:vanilla` starts the vanilla browser example.
- `npm run build:vanilla` builds the vanilla browser example.

## Vanilla Web Example

Run the example from the repo root:

```bash
npm run dev:vanilla
```

Open the local Vite URL in a browser, allow camera access, then use the Start and Stop buttons. The example imports the SDK from `src/`, shows the camera preview, draws pose landmarks on a canvas overlay, and displays active `leftHandUp`, `rightHandUp`, and `bothHandsUp` gestures.
