import path from "node:path";

export function resolveInside(root: string, ...parts: string[]) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...parts);
  if (target !== base && !target.startsWith(`${base}${path.sep}`)) {
    throw new Error("Path escapes the artifact root");
  }
  return target;
}
