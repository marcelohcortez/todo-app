import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Joins class names and resolves conflicts, so a later class (for example "mt-0") wins over an earlier one.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
