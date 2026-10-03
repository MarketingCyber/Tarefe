/**
 * Parses a Guide's plain-text body into the same {heading, paragraphs}[]
 * shape the old hardcoded guides-data.ts used — see
 * prisma/schema.prisma's Guide comment for why this is a tiny bespoke
 * convention rather than markdown. Blocks are separated by a blank line;
 * a block starting with "## " becomes a new section heading, everything
 * else becomes a paragraph in whichever section is currently open.
 */
export interface ParsedGuideSection {
  heading: string;
  paragraphs: string[];
}

export function parseGuideBody(body: string): ParsedGuideSection[] {
  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const sections: ParsedGuideSection[] = [];
  let current: ParsedGuideSection | null = null;

  for (const block of blocks) {
    if (block.startsWith("## ")) {
      current = { heading: block.slice(3).trim(), paragraphs: [] };
      sections.push(current);
      continue;
    }
    const paragraph = block.replace(/\s*\n\s*/g, " ").trim();
    if (!current) {
      // Body content before any "## " heading — keep it (an untitled
      // lead-in section) rather than silently dropping real text.
      current = { heading: "", paragraphs: [] };
      sections.push(current);
    }
    current.paragraphs.push(paragraph);
  }

  return sections;
}

export interface GuideSource {
  label: string;
  url: string;
}

/** Parses the admin form's one-per-line "Label | URL" textarea into the Json array Guide.sources actually stores. */
export function parseGuideSources(text: string): GuideSource[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, url] = line.split("|").map((s) => s.trim());
      return label && url ? { label, url } : null;
    })
    .filter((s): s is GuideSource => s !== null);
}

/** Inverse of parseGuideSources, for pre-filling the edit form's textarea. */
export function formatGuideSources(sources: GuideSource[]): string {
  return sources.map((s) => `${s.label} | ${s.url}`).join("\n");
}
