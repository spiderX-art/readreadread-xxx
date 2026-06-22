<template>
  <section>
    <header class="page-header">
      <div>
        <h1>百度网盘授权</h1>
        <p>连接你的百度网盘账号后，系统会读取你选择的 TXT 文件并导入私人书架。</p>
      </div>
    </header>

    <div class="panel">
      <div class="form-grid">
        <p v-if="message" class="success-text">{{ message }}</p>
        <p v-if="error" class="error-text">{{ error }}</p>
        <p v-if="authStore.userId" class="muted">当前百度账号：{{ authStore.displayName || authStore.userId }}</p>
        <p v-else class="muted">当前未连接百度网盘，系统会打开百度授权页面获取账号权限。</p>
        <div class="form-row">
          <button class="button" type="button" :disabled="autoStarting" @click="login">
            {{ connectButtonLabel }}
          </button>
          <button v-if="authStore.userId" class="button secondary" type="button" @click="logout">退出</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { getBaiduAuthorizationStatus } from "../services/auth.api";
import { useAuthStore } from "../stores/auth.store";

const BAIDU_AUTH_AUTO_START_KEY = "novel-cloud-reader.baidu-auth-auto-started-at";
const BAIDU_AUTH_AUTO_START_COOLDOWN_MS = 30_000;

const route = useRoute();
const authStore = useAuthStore();
const message = ref(route.query.baidu === "connected" ? "百度网盘授权已完成" : "");
const error = ref("");
const autoStarting = ref(false);
const connectButtonLabel = computed(() => {
  if (autoStarting.value) {
    return "正在打开百度授权...";
  }

  return authStore.userId ? "重新授权" : "连接百度网盘";
});

onMounted(() => {
  void autoStartBaiduLogin();
});

function logout(): void {
  authStore.logout();
  message.value = "";
  error.value = "";
}

async function login(): Promise<void> {
  error.value = "";
  message.value = "";

  try {
    markAutoStart();
    await authStore.startBaiduLogin(getReturnTo());
  } catch (loginError) {
    error.value = loginError instanceof Error ? loginError.message : "百度授权启动失败";
  }
}

async function autoStartBaiduLogin(): Promise<void> {
  if (route.query.baidu === "connected" || isAutoStartThrottled()) {
    return;
  }

  autoStarting.value = true;
  error.value = "";

  try {
    if (!authStore.userId) {
      markAutoStart();
      await authStore.startBaiduLogin(getReturnTo());
      return;
    }

    const status = await getBaiduAuthorizationStatus();

    if (status.connected) {
      message.value = "百度网盘已授权";
      return;
    }

    markAutoStart();
    await authStore.startBaiduLogin(getReturnTo());
  } catch (statusError) {
    error.value = statusError instanceof Error ? statusError.message : "百度授权状态检查失败";
  } finally {
    autoStarting.value = false;
  }
}

function getReturnTo(): string {
  return typeof route.query.returnTo === "string" && route.query.returnTo.startsWith("/")
    ? route.query.returnTo
    : "/auth";
}

function isAutoStartThrottled(): boolean {
  const lastStartedAt = Number(window.localStorage.getItem(BAIDU_AUTH_AUTO_START_KEY) ?? 0);
  return Number.isFinite(lastStartedAt) && Date.now() - lastStartedAt < BAIDU_AUTH_AUTO_START_COOLDOWN_MS;
}

function markAutoStart(): void {
  window.localStorage.setItem(BAIDU_AUTH_AUTO_START_KEY, String(Date.now()));
}
</script>
