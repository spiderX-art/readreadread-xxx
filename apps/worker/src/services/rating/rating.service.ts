import { isValidRatingValue } from "../../validators/rating.validator";

export function assertRatingValue(value: number): void {
  if (!isValidRatingValue(value)) {
    throw new RangeError("Rating must be between 1 and 10 in 0.5 increments");
  }
}
