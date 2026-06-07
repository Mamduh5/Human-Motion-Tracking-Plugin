import type { MotionTrackerEventMap } from "../types";

export type EventHandler<TPayload> = (payload: TPayload) => void;
export type EventMap = object;

export class EventEmitter<TEvents extends EventMap = MotionTrackerEventMap> {
  private readonly listeners = new Map<keyof TEvents, Set<EventHandler<TEvents[keyof TEvents]>>>();

  on<TEventName extends keyof TEvents>(
    eventName: TEventName,
    handler: EventHandler<TEvents[TEventName]>,
  ): this {
    const handlers = this.getOrCreateHandlers(eventName);
    handlers.add(handler as EventHandler<TEvents[keyof TEvents]>);

    return this;
  }

  off<TEventName extends keyof TEvents>(
    eventName: TEventName,
    handler: EventHandler<TEvents[TEventName]>,
  ): this {
    const handlers = this.listeners.get(eventName);

    if (!handlers) {
      return this;
    }

    handlers.delete(handler as EventHandler<TEvents[keyof TEvents]>);

    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }

    return this;
  }

  emit<TEventName extends keyof TEvents>(eventName: TEventName, payload: TEvents[TEventName]): this {
    const handlers = this.listeners.get(eventName);

    if (!handlers) {
      return this;
    }

    for (const handler of [...handlers]) {
      handler(payload);
    }

    return this;
  }

  removeAllListeners(): this {
    this.listeners.clear();

    return this;
  }

  private getOrCreateHandlers<TEventName extends keyof TEvents>(
    eventName: TEventName,
  ): Set<EventHandler<TEvents[keyof TEvents]>> {
    const handlers = this.listeners.get(eventName);

    if (handlers) {
      return handlers;
    }

    const nextHandlers = new Set<EventHandler<TEvents[keyof TEvents]>>();
    this.listeners.set(eventName, nextHandlers);

    return nextHandlers;
  }
}
