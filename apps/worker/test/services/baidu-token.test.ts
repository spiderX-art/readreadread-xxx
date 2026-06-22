import { afterEach, describe, expect, it, vi } from "vitest";
import type { BaiduTokenRow } from "../../src/db/repositories/token.repo";
import type { Bindings } from "../../src/env";
import {
  exchangeBaiduAuthorizationCode,
  getValidBaiduAccessToken
} from "../../src/services/baidu/baidu-token.service";

interface TokenDbState {
  tokens: BaiduTokenRow[];
  users: Array<{ id: string; displayName: string | null; avatarUrl: string | null }>;
}

const env = {
  BAIDU_CLIENT_ID: "client-id",
  BAIDU_CLIENT_SECRET: "client-secret",
  BAIDU_REDIRECT_URI: "http://localhost:8787/api/auth/baidu/callback"
} satisfies Pick<Bindings, "BAIDU_CLIENT_ID" | "BAIDU_CLIENT_SECRET" | "BAIDU_REDIRECT_URI">;

describe("baidu token service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges an authorization code and stores the token", async () => {
    const state: TokenDbState = { tokens: [], users: [] };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname === "/oauth/2.0/token") {
        expect(url.searchParams.get("grant_type")).toBe("authorization_code");
        expect(url.searchParams.get("code")).toBe("auth-code");
        expect(url.searchParams.get("client_id")).toBe("client-id");
        expect(url.searchParams.get("redirect_uri")).toBe(env.BAIDU_REDIRECT_URI);

        return jsonResponse({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600
        });
      }

      return jsonResponse({
        openid: "baidu-openid-1",
        userid: "legacy-user-id",
        username: "百度用户",
        portrait: "portrait-token"
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await exchangeBaiduAuthorizationCode(createTokenDbMock(state), env, "auth-code");

    expect(result.user).toMatchObject({
      id: "baidu:baidu-openid-1",
      baiduAccountId: "baidu-openid-1",
      displayName: "百度用户"
    });
    expect(result.token).toMatchObject({
      user_id: "baidu:baidu-openid-1",
      access_token: "access-token",
      refresh_token: "refresh-token"
    });
    expect(state.users).toEqual([
      {
        id: "baidu:baidu-openid-1",
        displayName: "百度用户",
        avatarUrl: "https://himg.bdimg.com/sys/portrait/item/portrait-token"
      }
    ]);
    expect(state.tokens).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a stored access token when it has not expired", async () => {
    const state: TokenDbState = {
      tokens: [
        createTokenRow({
          user_id: "user-1",
          access_token: "fresh-access",
          refresh_token: "refresh-token",
          expires_at: new Date(Date.now() + 120_000).toISOString()
        })
      ],
      users: []
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(getValidBaiduAccessToken(createTokenDbMock(state), env as Bindings, "user-1")).resolves.toBe(
      "fresh-access"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes an expired token and keeps the previous refresh token when Baidu omits a new one", async () => {
    const state: TokenDbState = {
      tokens: [
        createTokenRow({
          user_id: "user-1",
          access_token: "expired-access",
          refresh_token: "old-refresh",
          expires_at: new Date(Date.now() - 1000).toISOString()
        })
      ],
      users: []
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      expect(url.searchParams.get("grant_type")).toBe("refresh_token");
      expect(url.searchParams.get("refresh_token")).toBe("old-refresh");

      return jsonResponse({
        access_token: "new-access",
        expires_in: 3600
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getValidBaiduAccessToken(createTokenDbMock(state), env as Bindings, "user-1")).resolves.toBe(
      "new-access"
    );
    expect(state.tokens).toHaveLength(1);
    expect(state.tokens[0]).toMatchObject({
      access_token: "new-access",
      refresh_token: "old-refresh"
    });
  });
});

function createTokenDbMock(state: TokenDbState): D1Database {
  return {
    prepare: (sql: string) => ({
      bind: (...bindings: unknown[]) => ({
        run: async () => {
          runStatement(sql, bindings, state);
          return {
            success: true,
            meta: {}
          };
        },
        first: async <T>() => {
          const rows = queryStatement(sql, bindings, state);
          return (rows[0] ?? null) as T | null;
        }
      })
    })
  } as unknown as D1Database;
}

function runStatement(sql: string, bindings: unknown[], state: TokenDbState): void {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.startsWith("delete from baidu_tokens")) {
    const [userId] = bindings as [string];
    state.tokens = state.tokens.filter((token) => token.user_id !== userId);
    return;
  }

  if (normalizedSql.startsWith("insert into baidu_tokens")) {
    const [id, userId, accessToken, refreshToken, expiresAt, createdAt, updatedAt] = bindings as [
      string,
      string,
      string,
      string,
      string,
      string,
      string
    ];

    state.tokens.push({
      id,
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      created_at: createdAt,
      updated_at: updatedAt
    });
    return;
  }

  if (normalizedSql.startsWith("insert into users")) {
    const [id, displayName, avatarUrl] = bindings as [string, string | null, string | null];
    const existing = state.users.find((user) => user.id === id);

    if (existing) {
      existing.displayName = displayName;
      existing.avatarUrl = avatarUrl;
    } else {
      state.users.push({
        id,
        displayName,
        avatarUrl
      });
    }
    return;
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function queryStatement(sql: string, bindings: unknown[], state: TokenDbState): BaiduTokenRow[] {
  const normalizedSql = normalizeSql(sql);

  if (normalizedSql.includes("from baidu_tokens")) {
    const [userId] = bindings as [string];
    return state.tokens
      .filter((token) => token.user_id === userId)
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, 1);
  }

  throw new Error(`Unhandled SQL: ${normalizedSql}`);
}

function createTokenRow(input: Partial<BaiduTokenRow> = {}): BaiduTokenRow {
  const now = new Date().toISOString();

  return {
    id: "baidu_token_test",
    user_id: "user-1",
    access_token: "access-token",
    refresh_token: "refresh-token",
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    created_at: now,
    updated_at: now,
    ...input
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json"
    }
  });
}

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().toLowerCase();
}
