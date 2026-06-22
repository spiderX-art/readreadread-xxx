import { apiGet } from "./api";

export interface BaiduLoginResponse {
  authorizationUrl: string;
}

export interface BaiduAuthorizationStatus {
  connected: boolean;
  expiresAt?: string;
  needsReconnect: boolean;
}

export function getBaiduLoginUrl(returnTo?: string): Promise<BaiduLoginResponse> {
  const params = returnTo
    ? `?${new URLSearchParams({
        returnTo
      }).toString()}`
    : "";

  return apiGet<BaiduLoginResponse>(`/api/auth/baidu/login${params}`);
}

export function getBaiduAuthorizationStatus(): Promise<BaiduAuthorizationStatus> {
  return apiGet<BaiduAuthorizationStatus>("/api/auth/baidu/status");
}
