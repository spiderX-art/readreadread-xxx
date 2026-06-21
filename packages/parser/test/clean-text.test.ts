import { describe, expect, it } from "vitest";
import { cleanText } from "../src/clean-text";

describe("cleanText", () => {
  it("normalizes line endings and collapses extra blank lines", () => {
    expect(cleanText(" 第一行\r\n\r\n\r\n第二行  ")).toBe("第一行\n\n第二行");
  });
});
