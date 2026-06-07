import type { GestureResult } from "../types";

export interface GestureStabilityFilterOptions {
  activeFrameThreshold?: number;
  inactiveFrameThreshold?: number;
}

interface GestureStabilityState {
  pendingActive: boolean;
  consecutiveFrames: number;
  stableActive?: boolean;
}

const DEFAULT_FRAME_THRESHOLD = 3;

export class GestureStabilityFilter {
  private readonly activeFrameThreshold: number;
  private readonly inactiveFrameThreshold: number;
  private readonly states = new Map<string, GestureStabilityState>();

  constructor(options: GestureStabilityFilterOptions = {}) {
    this.activeFrameThreshold = options.activeFrameThreshold ?? DEFAULT_FRAME_THRESHOLD;
    this.inactiveFrameThreshold = options.inactiveFrameThreshold ?? DEFAULT_FRAME_THRESHOLD;
  }

  filter(gesture: GestureResult): GestureResult | undefined {
    const state = this.getState(gesture.name, gesture.active);

    if (state.pendingActive === gesture.active) {
      state.consecutiveFrames += 1;
    } else {
      state.pendingActive = gesture.active;
      state.consecutiveFrames = 1;
    }

    const requiredFrames = gesture.active ? this.activeFrameThreshold : this.inactiveFrameThreshold;

    if (state.consecutiveFrames < requiredFrames || state.stableActive === gesture.active) {
      return undefined;
    }

    state.stableActive = gesture.active;

    return {
      ...gesture,
      active: state.stableActive,
    };
  }

  reset(): void {
    this.states.clear();
  }

  private getState(name: string, active: boolean): GestureStabilityState {
    const existingState = this.states.get(name);

    if (existingState) {
      return existingState;
    }

    const state: GestureStabilityState = {
      pendingActive: active,
      consecutiveFrames: 0,
    };
    this.states.set(name, state);

    return state;
  }
}
