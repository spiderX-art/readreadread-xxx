<template>
  <section>
    <header class="page-header">
      <div>
        <h1>百度网盘授权</h1>
        <p>连接你的百度网盘账号后，系统会读取你选择的 TXT 文件并导入私人书架。</p>
      </div>
    </header>

    <div class="panel">
      <form class="form-grid" @submit.prevent="saveUser">
        <p v-if="message" class="success-text">{{ message }}</p>
        <p v-if="error" class="error-text">{{ error }}</p>
        <label>
          当前用户 ID
          <input v-model="userIdDraft" class="text-input" placeholder="例如 baidu-uid-123" />
        </label>
        <label>
          显示名
          <input v-model="displayNameDraft" class="text-input" placeholder="可选" />
        </label>
        <div class="form-row">
          <button class="button secondary" type="submit">保存当前用户</button>
          <button v-if="authStore.userId" class="button secondary" type="button" @click="logout">退出</button>
        </div>
      </form>
      <p v-if="authStore.userId" class="muted">当前用户：{{ authStore.displayName || authStore.userId }}</p>
      <p v-else class="error-text">未设置当前用户时，书架、导入和阅读进度请求会被拒绝。</p>
      <button class="button" type="button" @click="login">开始授权</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "../stores/auth.store";

const route = useRoute();
const authStore = useAuthStore();
const userIdDraft = ref(authStore.userId ?? "");
const displayNameDraft = ref(authStore.displayName ?? "");
const message = ref(route.query.baidu === "connected" ? "百度网盘授权已完成" : "");
const error = ref("");

function saveUser(): void {
  error.value = "";
  message.value = "";

  try {
    authStore.setCurrentUser(userIdDraft.value, displayNameDraft.value);
    message.value = "当前用户已保存";
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : "用户保存失败";
  }
}

function logout(): void {
  authStore.logout();
  userIdDraft.value = "";
  displayNameDraft.value = "";
  message.value = "";
  error.value = "";
}

async function login(): Promise<void> {
  error.value = "";
  message.value = "";

  if (!authStore.userId || authStore.userId !== userIdDraft.value.trim()) {
    try {
      authStore.setCurrentUser(userIdDraft.value, displayNameDraft.value);
    } catch (saveError) {
      error.value = saveError instanceof Error ? saveError.message : "请先保存当前用户";
      return;
    }
  }

  try {
    await authStore.startBaiduLogin();
  } catch (loginError) {
    error.value = loginError instanceof Error ? loginError.message : "百度授权启动失败";
  }
}
</script>
