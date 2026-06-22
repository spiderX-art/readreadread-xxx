import { describe, expect, it } from "vitest";
import {
  createBaiduAuthorizationState,
  normalizeFrontendReturnTo,
  parseBaiduAuthorizationState
} from "../../src/services/baidu/baidu-auth.service";

describe("baidu auth service", () => {
  it("creates and parses authorization state with a return path", () => {
    const state = createBaiduAuthorizationState({
      returnTo: "/netdisk?path=%2F%E5%B0%8F%E8%AF%B4"
    });

    expect(parseBaiduAuthorizationState(state)).toEqual({
      returnTo: "/netdisk?path=%2F%E5%B0%8F%E8%AF%B4"
    });
  });

  it("keeps compatibility with the previous raw state format", () => {
    expect(parseBaiduAuthorizationState("user-1")).toEqual({});
  });

  it("only accepts local frontend return paths", () => {
    expect(normalizeFrontendReturnTo("/netdisk")).toBe("/netdisk");
    expect(normalizeFrontendReturnTo("https://example.com")).toBeUndefined();
    expect(normalizeFrontendReturnTo("//example.com/path")).toBeUndefined();
  });
});
