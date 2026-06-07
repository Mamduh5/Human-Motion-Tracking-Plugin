export class EventEmitter {
    constructor() {
        this.listeners = new Map();
    }
    on(eventName, handler) {
        const handlers = this.getOrCreateHandlers(eventName);
        handlers.add(handler);
        return this;
    }
    off(eventName, handler) {
        const handlers = this.listeners.get(eventName);
        if (!handlers) {
            return this;
        }
        handlers.delete(handler);
        if (handlers.size === 0) {
            this.listeners.delete(eventName);
        }
        return this;
    }
    emit(eventName, payload) {
        const handlers = this.listeners.get(eventName);
        if (!handlers) {
            return this;
        }
        for (const handler of [...handlers]) {
            handler(payload);
        }
        return this;
    }
    removeAllListeners() {
        this.listeners.clear();
        return this;
    }
    getOrCreateHandlers(eventName) {
        const handlers = this.listeners.get(eventName);
        if (handlers) {
            return handlers;
        }
        const nextHandlers = new Set();
        this.listeners.set(eventName, nextHandlers);
        return nextHandlers;
    }
}
//# sourceMappingURL=EventEmitter.js.map