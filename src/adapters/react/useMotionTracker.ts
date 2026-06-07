import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { MotionTracker, type MotionTrackerDependencies, type MotionTrackerState } from "../../core";
import type {
  ExerciseResult,
  GestureResult,
  MotionTrackerConfig,
  MotionTrackerEventMap,
  PoseResult,
} from "../../types";

export interface UseMotionTrackerOptions {
  autoStart?: boolean;
  dependencies?: MotionTrackerDependencies;
}

export interface UseMotionTrackerResult {
  start: () => Promise<void>;
  stop: () => void;
  state: MotionTrackerState;
  latestPose: PoseResult | null;
  latestGestures: GestureResult[];
  latestExercises: ExerciseResult[];
  error: Error | null;
}

export function useMotionTracker(
  config: MotionTrackerConfig,
  options: UseMotionTrackerOptions = {},
): UseMotionTrackerResult {
  const configRef = useRef(config);
  const optionsRef = useRef(options);
  const trackerRef = useRef<MotionTracker | null>(null);
  const gesturesRef = useRef(new Map<string, GestureResult>());
  const exercisesRef = useRef(new Map<string, ExerciseResult>());
  const [state, setState] = useState<MotionTrackerState>({ status: "idle" });
  const [latestPose, setLatestPose] = useState<PoseResult | null>(null);
  const [latestGestures, setLatestGestures] = useState<GestureResult[]>([]);
  const [latestExercises, setLatestExercises] = useState<ExerciseResult[]>([]);
  const [error, setError] = useState<Error | null>(null);

  configRef.current = config;
  optionsRef.current = options;

  const resetLatestResults = useCallback(() => {
    gesturesRef.current.clear();
    exercisesRef.current.clear();
    setLatestPose(null);
    setLatestGestures([]);
    setLatestExercises([]);
    setError(null);
  }, []);

  const getOrCreateTracker = useCallback(() => {
    if (!trackerRef.current) {
      trackerRef.current = createTracker(configRef.current, optionsRef.current.dependencies, {
        onStateChange: setState,
        onPose: setLatestPose,
        onGesturesChange: setLatestGestures,
        onExercisesChange: setLatestExercises,
        onError: setError,
        gesturesRef,
        exercisesRef,
      });
    }

    return trackerRef.current;
  }, []);

  const start = useCallback(async () => {
    resetLatestResults();

    const tracker = getOrCreateTracker();

    try {
      await tracker.start();
      setState(tracker.getState());
    } catch (startError) {
      const normalizedError = normalizeError(startError);
      setError(normalizedError);
      setState(tracker.getState());
      throw normalizedError;
    }
  }, [getOrCreateTracker, resetLatestResults]);

  const stop = useCallback(() => {
    const tracker = trackerRef.current;

    if (!tracker) {
      return;
    }

    tracker.stop();
    setState(tracker.getState());
  }, []);

  useEffect(() => {
    if (!options.autoStart) {
      return;
    }

    void start();

    return undefined;
  }, [options.autoStart, start]);

  useEffect(() => {
    return () => {
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
  }, []);

  return {
    start,
    stop,
    state,
    latestPose,
    latestGestures,
    latestExercises,
    error,
  };
}

interface TrackerEventHandlers {
  onStateChange: (state: MotionTrackerState) => void;
  onPose: (pose: PoseResult) => void;
  onGesturesChange: (gestures: GestureResult[]) => void;
  onExercisesChange: (exercises: ExerciseResult[]) => void;
  onError: (error: Error) => void;
  gesturesRef: MutableRefObject<Map<string, GestureResult>>;
  exercisesRef: MutableRefObject<Map<string, ExerciseResult>>;
}

function createTracker(
  config: MotionTrackerConfig,
  dependencies: MotionTrackerDependencies | undefined,
  handlers: TrackerEventHandlers,
): MotionTracker {
  const tracker = new MotionTracker(config, dependencies);

  tracker.on("started", () => {
    handlers.onStateChange(tracker.getState());
  });
  tracker.on("stopped", () => {
    handlers.onStateChange(tracker.getState());
  });
  tracker.on("pose", (pose) => {
    handlers.onPose(pose);
    handlers.onStateChange(tracker.getState());
  });
  tracker.on("gesture", (gesture) => {
    updateGestureState(gesture, handlers);
  });
  tracker.on("exercise", (exercise) => {
    updateExerciseState(exercise, handlers);
  });
  tracker.on("error", (errorEvent) => {
    handlers.onError(createErrorFromEvent(errorEvent));
    handlers.onStateChange(tracker.getState());
  });

  return tracker;
}

function updateGestureState(gesture: GestureResult, handlers: TrackerEventHandlers): void {
  if (gesture.active) {
    handlers.gesturesRef.current.set(gesture.name, gesture);
  } else {
    handlers.gesturesRef.current.delete(gesture.name);
  }

  handlers.onGesturesChange([...handlers.gesturesRef.current.values()]);
}

function updateExerciseState(exercise: ExerciseResult, handlers: TrackerEventHandlers): void {
  handlers.exercisesRef.current.set(exercise.name, exercise);
  handlers.onExercisesChange([...handlers.exercisesRef.current.values()]);
}

function createErrorFromEvent(errorEvent: MotionTrackerEventMap["error"]): Error {
  if (errorEvent.cause instanceof Error) {
    return errorEvent.cause;
  }

  return new Error(errorEvent.message);
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
