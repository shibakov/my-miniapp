import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Number formatting helpers ---

/**
 * Round to 1 decimal place, returning a number.
 * Null/undefined/NaN -> 0.
 */
export function round1(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
}

/**
 * Format number with 1 decimal place as string.
 * Null/undefined/NaN -> "0.0".
 */
export function format1(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "0.0";
  return (Math.round(value * 10) / 10).toFixed(1);
}
