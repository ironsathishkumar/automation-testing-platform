export function toResourceKey(value: string, fallback = "ITEM") {
  const key = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return key || fallback;
}
