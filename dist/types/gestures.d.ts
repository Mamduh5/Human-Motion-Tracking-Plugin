export type GestureMetadata = Record<string, unknown>;
export interface GestureResult {
    name: string;
    active: boolean;
    confidence: number;
    timestamp: number;
    metadata?: GestureMetadata;
}
//# sourceMappingURL=gestures.d.ts.map