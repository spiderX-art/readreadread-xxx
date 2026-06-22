import { defineStore } from "pinia";
import { getBaiduLoginUrl } from "../services/auth.api";
import { clearAuthSession, getAuthSession, setAuthSession } from "../services/auth-session";

export const useAuthStore = defineStore("auth", {
  state: () => {
    const session = getAuthSession();

    return {
      userId: session?.userId,
      displayName: session?.displayName
    };
  },
  actions: {
    setCurrentUser(userId: string, displayName?: string) {
      const normalizedUserId = userId.trim();

      if (!normalizedUserId) {
        throw new Error("用户 ID 不能为空");
      }

      const session = {
        userId: normalizedUserId,
        displayName: displayName?.trim() || undefined
      };
      setAuthSession(session);
      this.userId = session.userId;
      this.displayName = session.displayName;
    },
    logout() {
      clearAuthSession();
      this.userId = undefined;
      this.displayName = undefined;
    },
    async startBaiduLogin() {
      const { authorizationUrl } = await getBaiduLoginUrl();
      window.location.assign(authorizationUrl);
    }
  }
});
