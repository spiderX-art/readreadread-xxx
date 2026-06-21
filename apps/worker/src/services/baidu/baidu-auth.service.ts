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
