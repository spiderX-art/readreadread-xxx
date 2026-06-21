export function normalizeMayReadLater(value: unknown): 0 | 1 {
  return value === true || value === 1 ? 1 : 0;
}
