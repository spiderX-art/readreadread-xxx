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
      <section
        v-if="showSyncNotice"
        class="sync-notice"
        :class="{
          'sync-notice-active': importSyncStore.loading,
          'sync-notice-error': importSyncStore.error
        }"
        aria-live="polite"
      >
        <div class="sync-notice-content">
          <div>
            <p>{{ syncNoticeTitle }}</p>
            <span>{{ syncNoticeDescription }}</span>
          </div>
          <button class="sync-notice-close" type="button" aria-label="关闭同步提示" @click="dismissSyncNotice">×</button>
        </div>
        <div class="sync-progress" role="progressbar" :aria-valuenow="importSyncStore.loading ? undefined : 100">
          <span />
        </div>
      </section>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useImportSyncStore } from "../stores/import-sync.store";

const importSyncStore = useImportSyncStore();
const syncNoticeDismissedAt = ref(0);
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
const showSyncNotice = computed(() => {
  if (!importSyncStore.lastStartedAt) {
    return false;
  }

  return syncNoticeDismissedAt.value < importSyncStore.lastStartedAt;
});
const syncNoticeTitle = computed(() => {
  if (importSyncStore.loading) {
    return "正在自动同步 /小说";
  }

  if (importSyncStore.error) {
    return "自动同步失败";
  }

  if (importSyncStore.result?.imported.length) {
    return `已导入 ${importSyncStore.result.imported.length} 本新书`;
  }

  return "自动同步完成";
});
const syncNoticeDescription = computed(() => {
  if (importSyncStore.loading) {
    return "正在扫描百度网盘 /小说，并导入未入库的 TXT 文件。";
  }

  if (importSyncStore.error) {
    return importSyncStore.error;
  }

  if (importSyncStore.result) {
    const { candidateCount, imported, skipped, failed } = importSyncStore.result;
    return `扫描 ${candidateCount} 个 TXT，新增 ${imported.length} 本，已存在 ${skipped.length} 本${failed.length ? `，失败 ${failed.length} 本` : ""}。`;
  }

  return "等待下一次自动同步。";
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
    // The global sync notice and bookshelf page own the visible error state.
  }
}

watch(
  () => importSyncStore.lastStartedAt,
  (startedAt) => {
    if (startedAt) {
      syncNoticeDismissedAt.value = 0;
    }
  }
);

function dismissSyncNotice(): void {
  syncNoticeDismissedAt.value = importSyncStore.lastStartedAt || Date.now();
}
</script>
