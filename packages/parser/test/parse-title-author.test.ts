import { describe, expect, it } from "vitest";
import { parseTitleAuthor } from "../src/parse-title-author";

describe("parseTitleAuthor", () => {
  it("parses dash separated title and author", () => {
    expect(parseTitleAuthor("[完本] 诡秘之主 - 爱潜水的乌贼.txt")).toEqual({
      title: "诡秘之主",
      author: "爱潜水的乌贼",
      versionTag: "完本"
    });
  });

  it("parses explicit author marker", () => {
    expect(parseTitleAuthor("诡秘之主 作者：爱潜水的乌贼.txt")).toMatchObject({
      title: "诡秘之主",
      author: "爱潜水的乌贼"
    });
  });
});
