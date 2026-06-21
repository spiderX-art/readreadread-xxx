import { defineStore } from "pinia";
import { getBaiduLoginUrl } from "../services/auth.api";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    userId: undefined as string | undefined,
    displayName: undefined as string | undefined
  }),
  actions: {
    async startBaiduLogin() {
      const { authorizationUrl } = await getBaiduLoginUrl();
      window.location.assign(authorizationUrl);
    }
  }
});
