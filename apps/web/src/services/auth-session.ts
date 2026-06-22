export interface AuthSession {
  userId: string;
  displayName?: string;
}

const AUTH_SESSION_STORAGE_KEY = "novel-cloud-reader.auth";

export function getAuthSession(): AuthSession | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!rawValue) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<AuthSession>;
    return typeof parsed.userId === "string" && parsed.userId.trim()
      ? {
          userId: parsed.userId.trim(),
          displayName: typeof parsed.displayName === "string" ? parsed.displayName : undefined
        }
      : undefined;
  } catch {
    return undefined;
  }
}

export function setAuthSession(session: AuthSession): void {
  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({
      userId: session.userId.trim(),
      displayName: session.displayName?.trim() || undefined
    })
  );
}

export function clearAuthSession(): void {
  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}
