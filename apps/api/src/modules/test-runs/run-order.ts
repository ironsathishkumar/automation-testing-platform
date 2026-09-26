export interface OrderedCase {
  setup?: boolean;
  sequence?: number | null;
}

/** Setup (sign-in) tests first, then numbered tests in ascending order, then the rest in their existing order. */
export function runOrder<T extends OrderedCase>(cases: T[]): T[] {
  const rank = (item: T) => (item.setup ? 0 : 1);
  const sequence = (item: T) => (typeof item.sequence === "number" ? item.sequence : Number.POSITIVE_INFINITY);
  return cases
    .map((item, index) => ({ item, index }))
    .sort((a, b) => rank(a.item) - rank(b.item) || sequence(a.item) - sequence(b.item) || a.index - b.index)
    .map(({ item }) => item);
}

export interface SessionPayload {
  key: string;
  index: number;
  total: number;
}

export function readSession(value: unknown): SessionPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const { key, index, total } = value as Record<string, unknown>;
  if (typeof key !== "string" || typeof index !== "number" || typeof total !== "number") return undefined;
  return { key, index, total };
}

export function withoutSession(payload: Record<string, unknown>) {
  const rest = { ...payload };
  delete rest.session;
  return rest;
}
