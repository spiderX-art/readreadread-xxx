import type { ApiResponse } from "shared";
import { getAuthSession } from "./auth-session";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: createHeaders()
  });
  return parseApiResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return parseApiResponse<T>(response);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return parseApiResponse<T>(response);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  return parseApiResponse<T>(response);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: createHeaders()
  });

  return parseApiResponse<T>(response);
}

function createHeaders(baseHeaders: Record<string, string> = {}): Record<string, string> {
  const session = getAuthSession();

  return {
    ...baseHeaders,
    ...(session ? { "x-user-id": session.userId } : {})
  };
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;

  if (!body.ok) {
    throw new ApiError(body.error.code, body.error.message, body.error.data);
  }

  return body.data;
}
