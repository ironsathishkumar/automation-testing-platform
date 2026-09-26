import path from "node:path";

export const TEXT_EXTENSIONS = new Set([".md", ".txt", ".csv", ".json", ".yaml", ".yml", ".feature"]);

export interface DocumentSection {
  title: string;
  level: number;
  body: string;
}

export function isReadableText(fileName: string) {
  return TEXT_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export function outlineDocument(fileName: string, text: string): DocumentSection[] {
  const extension = path.extname(fileName).toLowerCase();
  const pattern = extension === ".md" ? /^(#{1,4})\s+(.+?)\s*#*\s*$/ : extension === ".feature" ? /^\s*((?:Feature|Scenario(?: Outline)?|Rule)):\s*(.+)$/ : null;
  const sections: DocumentSection[] = [];
  let current: DocumentSection | null = null;
  const preamble: string[] = [];
  let inFence = false;

  for (const line of text.split(/\r?\n/)) {
    if (extension === ".md" && /^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const match = pattern && !inFence ? pattern.exec(line) : null;
    if (match) {
      if (current) sections.push(current);
      const level = extension === ".md" ? match[1].length : match[1] === "Feature" ? 1 : 2;
      current = { title: match[2].trim(), level, body: "" };
      continue;
    }
    if (current) current.body += `${line}\n`;
    else preamble.push(line);
  }
  if (current) sections.push(current);

  const intro = preamble.join("\n").trim();
  if (sections.length === 0) {
    return [{ title: path.parse(fileName).name, level: 1, body: text.trim() }];
  }
  if (intro) sections.unshift({ title: "Introduction", level: 1, body: intro });
  return sections.map((section) => ({ ...section, body: section.body.trim() }));
}
