import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 *  remove the .gba extension or the  (Europe) from a filename
 * @param filename
 * @returns
 */
export function removeFileExtension(filename?: string): string {
  return filename?.replace(/(\.gba)$/i, "").replace(/\s\(([^)]+)\)$/, "") || "";
}
