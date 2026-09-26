export function applyVariables(value: string, variables: Record<string, string>) {
  return value.replace(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export function buildUrl(base: string | undefined, target: string, query?: Record<string, string>) {
  const url = new URL(target, base ?? "http://127.0.0.1");
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }
  return url;
}

export function readJsonPath(payload: unknown, path: string) {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current && typeof current === "object" && part in current) {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, payload);
}
