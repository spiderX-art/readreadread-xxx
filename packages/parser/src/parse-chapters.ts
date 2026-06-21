import { cleanText } from "./clean-text";

export interface ParsedChapter {
  title: string;
  index: number;
  content: string;
  wordCount: number;
}

const CHAPTER_TITLE_PATTERN =
  /^\s*((第\s*[0-9零一二三四五六七八九十百千万〇两壹贰叁肆伍陆柒捌玖拾佰仟]+\s*[章节回卷部集])|(卷\s*[0-9零一二三四五六七八九十百千万〇两]+)|(楔子|序章|番外|后记)|(Chapter\s+\d+)).*$/i;

export function parseChapters(input: string): ParsedChapter[] {
  const lines = cleanText(input).split("\n");
  const chapters: ParsedChapter[] = [];
  let currentTitle = "正文";
  let currentLines: string[] = [];

  for (const line of lines) {
    if (CHAPTER_TITLE_PATTERN.test(line)) {
      pushChapter(chapters, currentTitle, currentLines);
      currentTitle = line.trim();
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  pushChapter(chapters, currentTitle, currentLines);

  return chapters.map((chapter, index) => ({
    ...chapter,
    index
  }));
}

function pushChapter(chapters: ParsedChapter[], title: string, lines: string[]): void {
  const content = cleanText(lines.join("\n"));
  if (!content && chapters.length === 0 && title === "正文") {
    return;
  }

  chapters.push({
    title,
    index: chapters.length,
    content,
    wordCount: countWords(content)
  });
}

function countWords(content: string): number {
  return content.replace(/\s+/g, "").length;
}
