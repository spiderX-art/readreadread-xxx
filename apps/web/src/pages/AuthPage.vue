<template>
  <section>
    <header class="page-header">
      <div>
        <h1>百度网盘授权</h1>
        <p>连接你的百度网盘账号后，系统会读取你选择的 TXT 文件并导入私人书架。</p>
      </div>
    </header>

    <section class="auth-hero panel">
      <div class="auth-mark" :class="{ connected: authStore.userId }" aria-hidden="true">
        <ShieldCheck />
      </div>
      <div class="auth-copy">
        <h2>{{ authStore.userId ? "百度网盘已授权" : "等待百度网盘授权" }}</h2>
        <p v-if="message" class="success-text">{{ message }}</p>
        <p v-if="error" class="error-text">{{ error }}</p>
        <span class="auth-status">{{ authStore.userId ? "授权状态：已授权" : "授权状态：未授权" }}</span>
        <p class="muted">
          {{ authStore.userId ? `当前百度账号：${authStore.displayName || authStore.userId}` : "连接后系统会读取你选择的 TXT 文件并导入私人书架。" }}
        </p>
      </div>
      <div class="auth-actions">
        <div class="form-row">
          <button class="button" type="button" :disabled="autoStarting" @click="login">
            <RotateCw v-if="authStore.userId" aria-hidden="true" />
            <Cloud v-else aria-hidden="true" />
            {{ connectButtonLabel }}
          </button>
          <button v-if="authStore.userId" class="button secondary" type="button" @click="logout">
            <LogOut aria-hidden="true" />退出
          </button>
        </div>
        <p class="muted">如果导入异常，可尝试重新授权。</p>
      </div>
    </section>

    <section class="panel auth-safety">
      <h2>授权说明与安全保障</h2>
      <div class="auth-safety-grid">
        <article>
          <strong>仅读取 TXT 文件</strong>
          <p>应用只扫描授权目录下的 TXT 文本文件，不读取其他类型文件。</p>
        </article>
        <article>
          <strong>隐私与数据安全</strong>
          <p>百度账号和文件数据由授权接口保护，系统仅保存导入所需的访问令牌。</p>
        </article>
        <article>
          <strong>可随时取消授权</strong>
          <p>你可以退出当前授权，应用会立即停止使用本地会话访问网盘。</p>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Cloud, LogOut, RotateCw, ShieldCheck } from "@lucide/vue";
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
