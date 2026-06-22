import type { BookStatus, RatingField } from "shared";

export const bookStatusLabels: Record<BookStatus, string> = {
  not_started: "未开始",
  reading: "在读",
  paused: "暂停",
  dropped: "弃读",
  finished: "已读完",
  reread: "想重读",
  favorite: "收藏",
  masterpiece: "神作",
  avoid: "避雷"
};

export const ratingFieldLabels: Record<RatingField, string> = {
  overall: "总评",
  writing: "文笔"
};

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
