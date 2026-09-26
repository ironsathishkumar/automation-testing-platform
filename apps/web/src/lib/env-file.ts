export interface ParsedVariable {
  key: string;
  value: string;
  isSecret: boolean;
}

export interface EnvFileResult {
  variables: ParsedVariable[];
  skipped: number[];
}

const KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SECRET_HINT = /(PASS|SECRET|TOKEN|PRIVATE|CREDENTIAL|API_?KEY|AUTH|_KEY$|^KEY$|DATABASE_URL|CONNECTION)/i;

export function looksSecret(key: string) {
  return SECRET_HINT.test(key);
}

function unquote(raw: string) {
  const value = raw.trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote)) {
    const inner = value.slice(1, -1);
    return quote === '"' ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"') : inner;
  }
  const comment = value.search(/\s#/);
  return comment === -1 ? value : value.slice(0, comment).trimEnd();
}

export function parseEnvFile(text: string): EnvFileResult {
  const byKey = new Map<string, ParsedVariable>();
  const skipped: number[] = [];
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;
    const withoutExport = line.replace(/^export\s+/, "");
    const separator = withoutExport.search(/[=:]/);
    if (separator <= 0) {
      skipped.push(index + 1);
      return;
    }
    const key = withoutExport.slice(0, separator).trim();
    if (!KEY.test(key) || key.length > 80) {
      skipped.push(index + 1);
      return;
    }
    const value = unquote(withoutExport.slice(separator + 1));
    byKey.set(key, { key, value, isSecret: looksSecret(key) });
  });
  return { variables: [...byKey.values()], skipped };
}
