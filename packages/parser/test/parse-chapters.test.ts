import { describe, expect, it } from "vitest";
import { parseChapters } from "../src/parse-chapters";

describe("parseChapters", () => {
  it("splits common Chinese chapter titles", () => {
    const chapters = parseChapters("序章\n开场\n第一章 风起\n正文");

    expect(chapters).toHaveLength(2);
    expect(chapters[0]?.title).toBe("序章");
    expect(chapters[1]?.title).toBe("第一章 风起");
  });
});
