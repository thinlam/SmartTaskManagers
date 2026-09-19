import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind class strings safely — later classes win over earlier
 * ones on the same property (e.g. a consumer's `className` overriding a
 * component's default). Every component in this package should compose
 * its className through this instead of raw string concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
