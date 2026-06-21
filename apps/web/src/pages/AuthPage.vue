<template>
  <section>
    <header class="page-header">
      <div>
        <h1>百度网盘授权</h1>
        <p>连接你的百度网盘账号后，系统会读取你选择的 TXT 文件并导入私人书架。</p>
      </div>
    </header>

    <div class="panel">
      <button class="button" type="button" @click="login">开始授权</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAuthStore } from "../stores/auth.store";

const authStore = useAuthStore();

function login(): void {
  void authStore.startBaiduLogin();
}
</script>
