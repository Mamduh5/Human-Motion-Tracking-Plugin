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

## React Adapter

React apps can import the optional hook from the React subpath:

```ts
import { useMotionTracker } from "human-motion-tracking-plugin/react";
```

The hook exposes `start`, `stop`, `state`, `latestPose`, `latestGestures`, `latestExercises`, and `error`, and stops the tracker automatically when the component unmounts. React is an optional peer dependency, so non-React SDK consumers do not load it.

Manual testing: use the hook inside a React component, call `start()` from a user gesture, verify camera permission opens, and confirm `stop()` or component unmount stops the camera.
