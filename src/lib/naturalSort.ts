/**
 * Ordering the way a person reads a list, not the way a computer sorts one.
 *
 * Plain string order puts M10 before M2 and C1 L11 before C1 L2, because it
 * compares character by character and '1' sorts before '2'. Digit runs
 * compare as numbers, everything else as text, so L4a lands between L4 and
 * L5 rather than beside L40. Use for code/SKU/label columns.
 */
export function naturalCompare(a: string, b: string): number {
  const split = (s: string) => s.match(/\d+|\D+/g) ?? [];
  const A = split(a), B = split(b);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d/.test(x), ny = /^\d/.test(y);
    if (nx && ny) {
      const d = Number(x) - Number(y);
      if (d) return d;
    } else {
      const d = x.localeCompare(y, undefined, { sensitivity: "base" });
      if (d) return d;
    }
  }
  return 0;
}
