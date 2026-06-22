export interface NetdiskFile {
  fsId: string;
  path: string;
  name: string;
  size: number;
  isDir: boolean;
  ext?: string;
  modifiedAt?: string;
  imported?: boolean;
  bookId?: string;
}

export interface ImportPreview {
  sourceFileId: string;
  sourcePath: string;
  fileName: string;
  fileSize: number;
  title: string;
  author?: string;
  versionTag?: string;
  estimatedChapterCount: number;
  sampleChapterTitles: string[];
}
