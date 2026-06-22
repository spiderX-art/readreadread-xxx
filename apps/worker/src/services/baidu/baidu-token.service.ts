import { findLatestBaiduTokenRow, replaceBaiduTokenRow, type BaiduTokenRow } from "../../db/repositories/token.repo";
import type { Bindings } from "../../env";
import { AppError } from "../../utils/errors";
import { createId } from "../../utils/id";

interface BaiduTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export function isTokenExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export async function exchangeBaiduAuthorizationCode(
  db: D1Database,
  env: Pick<Bindings, "BAIDU_CLIENT_ID" | "BAIDU_CLIENT_SECRET" | "BAIDU_REDIRECT_URI">,
  userId: string,
  code: string
): Promise<BaiduTokenRow> {
  const client = getBaiduClient(env);
  const url = new URL("https://openapi.baidu.com/oauth/2.0/token");
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("code", code);
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("client_secret", client.clientSecret);
  url.searchParams.set("redirect_uri", client.redirectUri);

  const token = await requestToken(url);
  return saveToken(db, userId, token);
}

export async function getValidBaiduAccessToken(db: D1Database, env: Bindings, userId: string): Promise<string> {
  const token = await findLatestBaiduTokenRow(db, userId);

  if (!token) {
    throw new AppError(401, "BAIDU_NOT_AUTHORIZED", "请先授权百度网盘");
  }

  if (!isTokenExpiredWithLeeway(token.expires_at)) {
    return token.access_token;
  }

  const client = getBaiduClient(env);
  const url = new URL("https://openapi.baidu.com/oauth/2.0/token");
  url.searchParams.set("grant_type", "refresh_token");
  url.searchParams.set("refresh_token", token.refresh_token);
  url.searchParams.set("client_id", client.clientId);
  url.searchParams.set("client_secret", client.clientSecret);

  const refreshed = await requestToken(url);
  const saved = await saveToken(db, userId, {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? token.refresh_token,
    expires_in: refreshed.expires_in
  });

  return saved.access_token;
}

function getBaiduClient(env: Pick<Bindings, "BAIDU_CLIENT_ID" | "BAIDU_CLIENT_SECRET" | "BAIDU_REDIRECT_URI">) {
  if (!env.BAIDU_CLIENT_ID || !env.BAIDU_CLIENT_SECRET || !env.BAIDU_REDIRECT_URI) {
    throw new AppError(500, "BAIDU_AUTH_NOT_CONFIGURED", "百度网盘授权配置缺失");
  }

  return {
    clientId: env.BAIDU_CLIENT_ID,
    clientSecret: env.BAIDU_CLIENT_SECRET,
    redirectUri: env.BAIDU_REDIRECT_URI
  };
}

async function requestToken(url: URL): Promise<Required<Pick<BaiduTokenResponse, "access_token" | "expires_in">> & BaiduTokenResponse> {
  const response = await fetch(url.toString());
  const body = (await response.json().catch(() => ({}))) as BaiduTokenResponse;

  if (!response.ok || body.error || !body.access_token || !body.expires_in) {
    throw new AppError(401, "BAIDU_TOKEN_EXCHANGE_FAILED", body.error_description ?? body.error ?? "百度授权失败");
  }

  return {
    ...body,
    access_token: body.access_token,
    expires_in: body.expires_in
  };
}

async function saveToken(
  db: D1Database,
  userId: string,
  token: Pick<BaiduTokenResponse, "access_token" | "refresh_token" | "expires_in">
): Promise<BaiduTokenRow> {
  if (!token.access_token || !token.refresh_token || !token.expires_in) {
    throw new AppError(401, "BAIDU_TOKEN_INVALID", "百度授权结果不完整");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + token.expires_in * 1000).toISOString();
  const id = createId("baidu_token");

  await replaceBaiduTokenRow(db, {
    id,
    userId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    createdAt: nowIso,
    updatedAt: nowIso
  });

  const saved = await findLatestBaiduTokenRow(db, userId);

  if (!saved) {
    throw new AppError(500, "BAIDU_TOKEN_SAVE_FAILED", "百度授权保存失败");
  }

  return saved;
}

function isTokenExpiredWithLeeway(expiresAt: string): boolean {
  return isTokenExpired(expiresAt, new Date(Date.now() + 60_000));
}
