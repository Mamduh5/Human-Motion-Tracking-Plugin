export class PluginManager {
    constructor(api) {
        this.api = api;
        this.plugins = new Map();
    }
    register(plugin) {
        if (!plugin.name.trim()) {
            throw new Error("MotionPlugin.name is required.");
        }
        if (this.plugins.has(plugin.name)) {
            throw new Error(`MotionPlugin "${plugin.name}" is already registered.`);
        }
        this.plugins.set(plugin.name, plugin);
    }
    unregister(name) {
        return this.plugins.delete(name);
    }
    has(name) {
        return this.plugins.has(name);
    }
    getPlugins() {
        return [...this.plugins.values()];
    }
    notifyStart(event) {
        this.callPlugins((plugin) => plugin.onStart?.(event, this.api));
    }
    notifyStop(event) {
        this.callPlugins((plugin) => plugin.onStop?.(event, this.api));
    }
    notifyPose(pose) {
        this.callPlugins((plugin) => plugin.onPose?.(pose, this.api));
    }
    notifyGesture(gesture) {
        this.callPlugins((plugin) => plugin.onGesture?.(gesture, this.api));
    }
    notifyExercise(exercise) {
        this.callPlugins((plugin) => plugin.onExercise?.(exercise, this.api));
    }
    callPlugins(callback) {
        for (const plugin of this.plugins.values()) {
            callback(plugin);
        }
    }
}
//# sourceMappingURL=PluginManager.js.map