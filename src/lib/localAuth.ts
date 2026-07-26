import type { Trip } from "./types";

const UNLOCK_KEY_PREFIX = "trip-ledger-unlocked-";

export function checkEditPassword(trip: Trip, input: string): boolean {
  return trip.editPassword === input;
}

export function isUnlocked(code: string): boolean {
  return localStorage.getItem(UNLOCK_KEY_PREFIX + code) === "1";
}

export function unlockTrip(code: string): void {
  localStorage.setItem(UNLOCK_KEY_PREFIX + code, "1");
}
