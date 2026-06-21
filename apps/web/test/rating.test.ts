import { describe, expect, it } from "vitest";
import { isValidScore } from "../src/utils/rating";

describe("isValidScore", () => {
  it("accepts scores from 1 to 10 in 0.5 steps", () => {
    expect(isValidScore(1)).toBe(true);
    expect(isValidScore(8.5)).toBe(true);
    expect(isValidScore(10)).toBe(true);
  });

  it("rejects invalid score values", () => {
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(8.3)).toBe(false);
    expect(isValidScore(10.5)).toBe(false);
  });
});
