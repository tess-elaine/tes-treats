import { twMerge } from "tailwind-merge";

type ClassValue = string | number | null | false | undefined | ClassValue[];

/**
 * Class merger backed by `tailwind-merge` — when two conflicting Tailwind
 * utility classes appear (e.g. `bg-primary` and `bg-surface-container-lowest`),
 * the *later one in the class string wins*, regardless of CSS source order.
 *
 * This makes default classes from low-level components (NibbleCard's
 * `bg-surface-container-lowest`) overridable from the consumer's className.
 */
export function cn(...inputs: ClassValue[]): string {
  const flat: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v && v !== 0) return;
    if (Array.isArray(v)) v.forEach(walk);
    else flat.push(String(v));
  };
  inputs.forEach(walk);
  return twMerge(flat.join(" "));
}
