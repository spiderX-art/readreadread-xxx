export function isValidRatingValue(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 10 &&
    Number.isInteger(value * 2)
  );
}
