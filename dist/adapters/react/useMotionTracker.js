import { useCallback, useEffect, useRef, useState } from "react";
import { MotionTracker } from "../../core";
export function useMotionTracker(config, options = {}) {
    const configRef = useRef(config);
    const optionsRef = useRef(options);
    const trackerRef = useRef(null);
    const gesturesRef = useRef(new Map());
    const exercisesRef = useRef(new Map());
    const [state, setState] = useState({ status: "idle" });
    const [latestPose, setLatestPose] = useState(null);
    const [latestGestures, setLatestGestures] = useState([]);
    const [latestExercises, setLatestExercises] = useState([]);
    const [error, setError] = useState(null);
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
        }
        catch (startError) {
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
function createTracker(config, dependencies, handlers) {
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
function updateGestureState(gesture, handlers) {
    if (gesture.active) {
        handlers.gesturesRef.current.set(gesture.name, gesture);
    }
    else {
        handlers.gesturesRef.current.delete(gesture.name);
    }
    handlers.onGesturesChange([...handlers.gesturesRef.current.values()]);
}
function updateExerciseState(exercise, handlers) {
    handlers.exercisesRef.current.set(exercise.name, exercise);
    handlers.onExercisesChange([...handlers.exercisesRef.current.values()]);
}
function createErrorFromEvent(errorEvent) {
    if (errorEvent.cause instanceof Error) {
        return errorEvent.cause;
    }
    return new Error(errorEvent.message);
}
function normalizeError(error) {
    return error instanceof Error ? error : new Error(String(error));
}
//# sourceMappingURL=useMotionTracker.js.map