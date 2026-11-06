import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Junta classes do Tailwind. Em conflito, vale a última. */
export function cn(...entradas: ClassValue[]): string {
  return twMerge(clsx(entradas));
}
