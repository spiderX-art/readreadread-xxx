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
  plot: "剧情",
  writing: "文笔",
  character: "人物",
  pacing: "节奏",
  worldbuilding: "世界观",
  satisfaction: "爽感",
  endingStability: "后期稳定性",
  rereadValue: "重读价值"
};
