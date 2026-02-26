import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function generateRefId(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, "0")}`;
}
