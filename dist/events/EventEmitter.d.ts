import type { MotionTrackerEventMap } from "../types";
export type EventHandler<TPayload> = (payload: TPayload) => void;
export type EventMap = object;
export declare class EventEmitter<TEvents extends EventMap = MotionTrackerEventMap> {
    private readonly listeners;
    on<TEventName extends keyof TEvents>(eventName: TEventName, handler: EventHandler<TEvents[TEventName]>): this;
    off<TEventName extends keyof TEvents>(eventName: TEventName, handler: EventHandler<TEvents[TEventName]>): this;
    emit<TEventName extends keyof TEvents>(eventName: TEventName, payload: TEvents[TEventName]): this;
    removeAllListeners(): this;
    private getOrCreateHandlers;
}
//# sourceMappingURL=EventEmitter.d.ts.map