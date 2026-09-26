export const VISUAL_FAIL_RATIO = 0.001;

export function diffRatio(diffPixels: number, width: number, height: number) {
  const total = width * height;
  if (!Number.isFinite(diffPixels) || total <= 0) return 1;
  return diffPixels / total;
}
