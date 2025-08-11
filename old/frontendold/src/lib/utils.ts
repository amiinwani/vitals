import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'N/A';
  return `$${numPrice.toFixed(2)}`;
}

export function formatWeight(weight: string): string {
  if (!weight) return 'N/A';
  return weight.trim();
}

export function getNutritionValue(value: number | string | null): number {
  if (value === null || value === undefined || value === '') return 0;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? 0 : numValue;
}

