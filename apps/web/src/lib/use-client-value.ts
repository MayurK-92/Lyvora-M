"use client";

import { useSyncExternalStore } from "react";

const neverChanges = () => () => {};

/**
 * Reads a browser-only value (localStorage, `window.location`, feature
 * detection) after hydration without a setState-in-effect round trip.
 *
 * `read` must return a primitive or a referentially stable value, since React
 * calls it on every render to detect changes.
 */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(neverChanges, read, () => serverValue);
}
