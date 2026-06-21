import type { ApiFailure, ApiSuccess } from "shared";

export function ok<T>(data: T): ApiSuccess<T> {
  return {
    ok: true,
    data
  };
}

export function fail(code: string, message: string): ApiFailure {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}
