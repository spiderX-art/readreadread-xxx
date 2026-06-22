export class AppError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 500,
    public readonly code: string,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}
