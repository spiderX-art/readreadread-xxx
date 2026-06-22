<template>
  <div class="app-shell">
    <aside class="side-nav" aria-label="主导航">
      <RouterLink class="brand" to="/books">
        <span class="brand-mark">阅</span>
        <span>
          <strong>私人书架</strong>
          <small>Cloud Reader</small>
        </span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/books"><span>书</span>书架</RouterLink>
        <RouterLink to="/netdisk"><span>盘</span>网盘导入</RouterLink>
        <RouterLink to="/auth"><span>权</span>授权管理</RouterLink>
      </nav>

      <section class="nav-stats" aria-label="同步状态">
        <p>自动同步</p>
        <strong>{{ syncLabel }}</strong>
        <small>/小说</small>
      </section>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useImportSyncStore } from "../stores/import-sync.store";

const importSyncStore = useImportSyncStore();
const syncLabel = computed(() => {
  if (importSyncStore.loading) {
    return "扫描中";
  }

  if (importSyncStore.result) {
    return `新增 ${importSyncStore.result.imported.length}`;
  }

  if (importSyncStore.error) {
    return "待授权";
  }

  return "待扫描";
});

onMounted(() => {
  void triggerSync();
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("focus", handleWindowFocus);
});

function handleVisibilityChange(): void {
  if (!document.hidden) {
    void triggerSync();
  }
}

function handleWindowFocus(): void {
  void triggerSync();
}

async function triggerSync(): Promise<void> {
  try {
    await importSyncStore.sync();
  } catch {
    // The bookshelf page surfaces the sync status when it is relevant.
  }
}
</script>
