# Manual QA Checklist

Use this checklist to verify the vanilla web demo from a clean checkout or after changes that may affect camera, pose, or gesture behavior.

## npm install

- [ ] From the repository root, run:

  ```bash
  npm install
  ```

- [ ] Confirm dependencies install without errors.
- [ ] Confirm `node_modules/` is present after installation.
- [ ] If installation fails, retry after checking the Node.js and npm versions used by the project.

## npm run dev:vanilla

- [ ] From the repository root, run:

  ```bash
  npm run dev:vanilla
  ```

- [ ] Confirm Vite starts successfully.
- [ ] Open the local Vite URL shown in the terminal.
- [ ] Confirm the page title or heading reads `Human Motion Tracking Plugin`.
- [ ] Confirm the initial status reads `Idle`.
- [ ] Confirm `Start` is enabled and `Stop` is disabled before tracking starts.

## Camera Permission

- [ ] Click `Start`.
- [ ] Confirm the browser asks for camera permission if permission has not already been granted.
- [ ] Allow camera access.
- [ ] Confirm the status changes through `Starting` and then to `Running`.
- [ ] Confirm `Start` becomes disabled while tracking is running.
- [ ] Confirm `Stop` becomes enabled while tracking is running.
- [ ] If permission is denied, confirm the demo shows an error message instead of silently failing.

## Video Preview

- [ ] Confirm the camera preview appears in the stage area.
- [ ] Confirm the preview updates live as the tester moves.
- [ ] Confirm the preview is mirrored like a front-facing camera.
- [ ] Confirm the preview remains inside the stage area without overflowing or distorting the page layout.

## Pose Landmark Overlay

- [ ] Stand fully visible in the camera frame.
- [ ] Confirm pose landmarks are drawn on top of the video preview.
- [ ] Move arms and torso slowly.
- [ ] Confirm the overlay follows the visible body motion.
- [ ] Confirm the overlay clears when tracking stops.
- [ ] Confirm no old landmarks remain stuck on screen after stopping and starting again.

## Left Hand Up Detection

- [ ] Start with both hands down.
- [ ] Confirm `Active gestures` reads `None`.
- [ ] Raise only the left hand above shoulder/head level.
- [ ] Confirm `leftHandUp` appears in `Active gestures`.
- [ ] Lower the left hand.
- [ ] Confirm `leftHandUp` is removed from `Active gestures`.
- [ ] Confirm raising only the left hand does not incorrectly require the right hand to be raised.

## Right Hand Up Detection

- [ ] Start with both hands down.
- [ ] Confirm `Active gestures` reads `None`.
- [ ] Raise only the right hand above shoulder/head level.
- [ ] Confirm `rightHandUp` appears in `Active gestures`.
- [ ] Lower the right hand.
- [ ] Confirm `rightHandUp` is removed from `Active gestures`.
- [ ] Confirm raising only the right hand does not incorrectly require the left hand to be raised.

## Both Hands Up Detection

- [ ] Start with both hands down.
- [ ] Raise both hands above shoulder/head level.
- [ ] Confirm `bothHandsUp` appears in `Active gestures`.
- [ ] Confirm `leftHandUp` and `rightHandUp` may also appear while both hands are raised.
- [ ] Lower one hand.
- [ ] Confirm `bothHandsUp` is removed while the remaining single-hand gesture can stay active.
- [ ] Lower both hands.
- [ ] Confirm `Active gestures` returns to `None`.

## Squat Analyzer Behavior If Visible In Demo

- [ ] Check whether the vanilla demo shows any squat, exercise, rep count, or movement-stage output.
- [ ] If no squat analyzer UI is visible, record this section as not applicable for the current vanilla demo.
- [ ] If squat output is visible, stand fully in frame before starting the movement.
- [ ] Perform a controlled squat with knees and hips visible.
- [ ] Confirm the squat analyzer updates only while the body is visible enough for pose tracking.
- [ ] Confirm rep or stage output does not increment while standing still.
- [ ] Confirm incomplete or partial squats do not count as full repetitions unless that is expected by the current analyzer behavior.
- [ ] Confirm stopping tracking resets or freezes the visible squat output in a predictable way.

## Stop Button Turns Camera Off

- [ ] While tracking is running, click `Stop`.
- [ ] Confirm the status changes to `Stopped`.
- [ ] Confirm `Start` becomes enabled.
- [ ] Confirm `Stop` becomes disabled.
- [ ] Confirm `Active gestures` returns to `None`.
- [ ] Confirm the pose overlay clears.
- [ ] Confirm the browser camera indicator turns off.
- [ ] Confirm the physical camera light, if present, turns off.
- [ ] Click `Start` again and confirm the camera can restart without refreshing the page.

## Common Browser Troubleshooting

- [ ] Use a browser with `navigator.mediaDevices.getUserMedia` support, such as a current Chrome, Edge, Firefox, or Safari release.
- [ ] Use `localhost`, `127.0.0.1`, or HTTPS. Camera access is usually blocked on insecure non-local origins.
- [ ] Check browser site settings if the permission prompt does not appear.
- [ ] Reset camera permission for the local Vite URL if permission was previously denied.
- [ ] Close other apps that may be holding exclusive camera access.
- [ ] Confirm the correct camera is selected in browser or operating system settings.
- [ ] Reload the page after changing camera permissions.
- [ ] Open browser developer tools and check the console for MediaPipe model, WASM, network, or camera errors.
- [ ] Confirm the MediaPipe model and WASM URLs are reachable from the test network.
- [ ] Try a hard refresh or private browsing window if stale cached assets appear to be used.
