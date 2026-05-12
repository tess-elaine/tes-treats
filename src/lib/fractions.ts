// Baker-friendly fraction display for recipe quantities.
// Snaps decimal values to the nearest common baker fraction.

const BAKER_FRACS: [number, string][] = [
  [1 / 8,  "1/8"],
  [1 / 4,  "1/4"],
  [1 / 3,  "1/3"],
  [3 / 8,  "3/8"],
  [1 / 2,  "1/2"],
  [5 / 8,  "5/8"],
  [2 / 3,  "2/3"],
  [3 / 4,  "3/4"],
  [7 / 8,  "7/8"],
];

// Fractional parts smaller than this snap to the nearest whole number.
const SNAP_THRESHOLD = 1 / 16;

export function toFraction(n: number): string {
  if (!isFinite(n) || n <= 0) return "0";

  const whole = Math.floor(n);
  const decimal = n - whole;

  if (decimal < SNAP_THRESHOLD)       return String(whole === 0 ? 1 : whole);
  if (decimal > 1 - SNAP_THRESHOLD)   return String(whole + 1);

  let bestStr = BAKER_FRACS[0][1];
  let bestDist = Infinity;

  for (const [val, str] of BAKER_FRACS) {
    const dist = Math.abs(decimal - val);
    if (dist < bestDist) {
      bestDist = dist;
      bestStr = str;
    }
  }

  return whole === 0 ? bestStr : `${whole} ${bestStr}`;
}
