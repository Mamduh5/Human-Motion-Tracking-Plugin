export function getTimestamp() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
}
//# sourceMappingURL=time.js.map