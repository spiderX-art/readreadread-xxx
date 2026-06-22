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
import { useAuthStore } from "../stores/auth.store";

const authStore = useAuthStore();
const userIdDraft = ref(authStore.userId ?? "");
const displayNameDraft = ref(authStore.displayName ?? "");

function saveUser(): void {
  authStore.setCurrentUser(userIdDraft.value, displayNameDraft.value);
}

function logout(): void {
  authStore.logout();
  userIdDraft.value = "";
  displayNameDraft.value = "";
}

function login(): void {
  void authStore.startBaiduLogin();
}
</script>
