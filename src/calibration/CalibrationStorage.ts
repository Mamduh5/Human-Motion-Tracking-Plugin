import type { CalibrationResult } from "../types";
import { parseCalibration, serializeCalibration } from "./CalibrationSerialization";

export type CalibrationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function saveCalibration(key: string, result: CalibrationResult, storage = getDefaultStorage()): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, serializeCalibration(result));
    return true;
  } catch {
    return false;
  }
}

export function loadCalibration(key: string, storage = getDefaultStorage()): CalibrationResult | undefined {
  if (!storage) {
    return undefined;
  }

  try {
    const value = storage.getItem(key);

    return value ? parseCalibration(value) : undefined;
  } catch {
    return undefined;
  }
}

export function clearCalibration(key: string, storage = getDefaultStorage()): boolean {
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function getDefaultStorage(): CalibrationStorage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
