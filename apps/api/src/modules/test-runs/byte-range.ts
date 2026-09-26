/** Parses a single `bytes=` range. Multi-range requests are served whole, which the HTTP spec allows. */
export function parseByteRange(header: string | undefined, size: number): { start: number; end: number } | "unsatisfiable" | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
  if (!match || (!match[1] && !match[2])) return undefined;
  let start: number;
  let end: number;
  if (!match[1]) {
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (size === 0 || start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
