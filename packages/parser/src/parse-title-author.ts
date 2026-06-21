export interface ParsedTitleAuthor {
  title: string;
  author?: string;
  versionTag?: string;
}

const VERSION_TAG_PATTERN = /(完本|全集|精校|校对版|完整版)/g;
const EXTENSION_PATTERN = /\.(txt|epub)$/i;

export function parseTitleAuthor(fileName: string): ParsedTitleAuthor {
  const baseName = fileName.split(/[\\/]/).at(-1)?.replace(EXTENSION_PATTERN, "") ?? fileName;
  const versionTags = [...baseName.matchAll(VERSION_TAG_PATTERN)].map((match) => match[1]);
  const normalized = baseName
    .replace(/(?:【|\[)?(完本|全集|精校|校对版|完整版)(?:】|\])?/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const authorPatterns = [
    /^(?<title>.+?)\s+作者[:：]\s*(?<author>.+)$/,
    /^(?<title>.+?)\s*[-_—]\s*(?<author>.+)$/
  ];

  for (const pattern of authorPatterns) {
    const match = normalized.match(pattern);
    const title = match?.groups?.title?.trim();
    const author = match?.groups?.author?.trim();
    if (title && author) {
      return {
        title: stripTrailingNoise(title),
        author: stripTrailingNoise(author),
        versionTag: versionTags[0]
      };
    }
  }

  return {
    title: stripTrailingNoise(normalized),
    versionTag: versionTags[0]
  };
}

function stripTrailingNoise(value: string): string {
  return value.replace(/\b(txt|epub)\b/gi, "").replace(/\s+/g, " ").trim();
}
