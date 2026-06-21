export interface FulltextHit {
  chapterId: string;
  chapterTitle: string;
  position: number;
  context: string;
}

export function searchChapterText(chapterId: string, chapterTitle: string, content: string, q: string): FulltextHit[] {
  const keyword = q.trim();
  if (!keyword) {
    return [];
  }

  const position = content.indexOf(keyword);
  if (position < 0) {
    return [];
  }

  return [
    {
      chapterId,
      chapterTitle,
      position,
      context: content.slice(Math.max(0, position - 40), position + keyword.length + 40)
    }
  ];
}
