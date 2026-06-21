import { apiGet } from "./api";

export interface BaiduLoginResponse {
  authorizationUrl: string;
}

export function getBaiduLoginUrl(): Promise<BaiduLoginResponse> {
  return apiGet<BaiduLoginResponse>("/api/auth/baidu/login");
}
