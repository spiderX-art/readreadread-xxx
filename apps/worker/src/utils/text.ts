export function countTextWords(value: string): number {
  return value.replace(/\s+/g, "").length;
}
