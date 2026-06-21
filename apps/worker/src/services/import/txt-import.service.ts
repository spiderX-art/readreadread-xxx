import { parseTitleAuthor } from "parser";

export function previewTxtImport(fileName: string) {
  return parseTitleAuthor(fileName);
}
