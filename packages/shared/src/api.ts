export interface ApiErrorBody {
  code: string;
  message: string;
  data?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PageResult<T> {
  items: T[];
  total: number;
  cursor?: string;
}
