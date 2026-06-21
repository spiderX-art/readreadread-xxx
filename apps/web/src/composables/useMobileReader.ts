export function getTapZone(x: number, width: number): "previous" | "menu" | "next" {
  if (x < width * 0.28) {
    return "previous";
  }

  if (x > width * 0.72) {
    return "next";
  }

  return "menu";
}
