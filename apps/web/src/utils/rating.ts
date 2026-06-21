export function isValidScore(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 10 && Number.isInteger(value * 2);
}
