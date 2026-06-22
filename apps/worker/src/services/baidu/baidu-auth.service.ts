export function createBaiduAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state?: string;
}): string {
  const url = new URL("https://openapi.baidu.com/oauth/2.0/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", "basic,netdisk");

  if (input.state) {
    url.searchParams.set("state", input.state);
  }

  return url.toString();
}

export function createBaiduAuthorizationState(input: { returnTo?: string }): string {
  return `novel:${JSON.stringify({
    ...(input.returnTo ? { returnTo: input.returnTo } : {})
  })}`;
}

export function parseBaiduAuthorizationState(state: string): { returnTo?: string } {
  if (!state.startsWith("novel:")) {
    return {};
  }

  const parsed = JSON.parse(state.slice("novel:".length)) as Partial<{ returnTo: unknown }>;

  return {
    returnTo: typeof parsed.returnTo === "string" ? parsed.returnTo : undefined
  };
}

export function normalizeFrontendReturnTo(returnTo?: string): string | undefined {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return undefined;
  }

  return returnTo;
}
