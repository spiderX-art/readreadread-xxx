import { describe, expect, it } from "vitest";
import { isValidRatingValue } from "../../src/validators/rating.validator";

describe("isValidRatingValue", () => {
  it("accepts 1-10 values in 0.5 increments", () => {
    expect(isValidRatingValue(1)).toBe(true);
    expect(isValidRatingValue(8.5)).toBe(true);
    expect(isValidRatingValue(10)).toBe(true);
  });

  it("rejects values outside range or step", () => {
    expect(isValidRatingValue(0)).toBe(false);
    expect(isValidRatingValue(10.2)).toBe(false);
    expect(isValidRatingValue(8.3)).toBe(false);
  });
});
