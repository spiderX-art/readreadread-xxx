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
        <RouterLink to="/books"><span class="nav-link-icon"><BookOpen aria-hidden="true" /></span>书架</RouterLink>
        <RouterLink to="/netdisk"><span class="nav-link-icon"><Cloud aria-hidden="true" /></span>网盘导入</RouterLink>
        <RouterLink to="/auth"><span class="nav-link-icon"><ShieldCheck aria-hidden="true" /></span>授权管理</RouterLink>
      </nav>

      <section class="nav-stats" aria-label="同步状态">
        <p>自动同步</p>
        <strong>{{ syncLabel }}</strong>
        <small>/小说</small>
      </section>
    </aside>

    <header class="top-nav" aria-label="窄屏主导航">
      <RouterLink class="brand" to="/books">
        <span class="brand-mark">阅</span>
        <span>
          <strong>私人书架</strong>
          <small>Cloud Reader</small>
        </span>
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/books">书架</RouterLink>
        <RouterLink to="/netdisk">导入</RouterLink>
        <RouterLink to="/auth">授权</RouterLink>
      </nav>

      <div class="nav-account" aria-label="当前账号">
        <span class="account-avatar">{{ accountInitial }}</span>
        <ChevronDown class="account-caret" aria-hidden="true" />
      </div>
    </header>

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
          <span class="sync-notice-icon" aria-hidden="true"><CloudDownload /></span>
          <div>
            <p>{{ syncNoticeTitle }}</p>
            <span>{{ syncNoticeDescription }}</span>
          </div>
          <button class="sync-notice-close" type="button" aria-label="关闭同步提示" @click="dismissSyncNotice">
            <X aria-hidden="true" />
          </button>
        </div>
        <div class="sync-progress" role="progressbar" :aria-valuenow="syncProgressPercent">
          <span :style="{ width: `${syncProgressPercent}%` }" />
        </div>
      </section>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { BookOpen, ChevronDown, Cloud, CloudDownload, ShieldCheck, X } from "@lucide/vue";
import { useRoute, useRouter } from "vue-router";
import { ApiError } from "../services/api";
import { useAuthStore } from "../stores/auth.store";
import { useImportSyncStore } from "../stores/import-sync.store";

const importSyncStore = useImportSyncStore();
const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const syncNoticeDismissedAt = ref(0);
const accountInitial = computed(() => {
  const label = authStore.displayName || authStore.userId || "R";
  return label.trim().charAt(0).toUpperCase() || "R";
});
const syncLabel = computed(() => {
  if (importSyncStore.loading) {
    return importSyncStore.job?.status === "importing" ? "导入中" : "扫描中";
  }

  if (importSyncStore.job) {
    return `新增 ${importSyncStore.job.importedCount}`;
  }

  if (importSyncStore.error) {
    return "待授权";
  }

  return "待扫描";
});
const syncProgressPercent = computed(() => {
  const job = importSyncStore.job;

  if (!job) {
    return importSyncStore.loading ? 8 : 100;
  }

  if (job.status === "completed" || job.status === "failed") {
    return 100;
  }

  if (job.status === "scanning" || job.candidateCount === 0) {
    return 8;
  }

  return Math.max(8, Math.round((job.processedCount / job.candidateCount) * 100));
});
const showSyncNotice = computed(() => {
  if (!importSyncStore.lastStartedAt) {
    return false;
  }

  return syncNoticeDismissedAt.value < importSyncStore.lastStartedAt;
});
const syncNoticeTitle = computed(() => {
  if (importSyncStore.loading) {
    return importSyncStore.job?.status === "importing" ? "正在导入 /小说" : "正在扫描 /小说";
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
    const job = importSyncStore.job;

    if (!job || job.status === "scanning") {
      return "正在扫描百度网盘 /小说 下的 TXT 文件。";
    }

    return `正在导入第 ${job.processedCount + 1} / ${job.candidateCount} 本，已成功 ${job.importedCount} 本，跳过 ${job.skippedCount} 本。`;
  }

  if (importSyncStore.error) {
    return importSyncStore.error;
  }

  if (importSyncStore.job) {
    const job = importSyncStore.job;
    return `扫描 ${job.candidateCount} 个 TXT，新增 ${job.importedCount} 本，已存在 ${job.skippedCount} 本${job.failedCount ? `，失败 ${job.failedCount} 本` : ""}。`;
  }

  return "等待下一次自动同步。";
});

applyBaiduCallbackSession();

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
  } catch (syncError) {
    if (syncError instanceof ApiError && syncError.code === "BAIDU_NOT_AUTHORIZED" && route.name !== "auth") {
      await router.push({
        name: "auth",
        query: {
          auto: "1",
          returnTo: route.fullPath
        }
      });
    }
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

watch(
  () => route.fullPath,
  () => {
    applyBaiduCallbackSession();
  }
);

function dismissSyncNotice(): void {
  syncNoticeDismissedAt.value = importSyncStore.lastStartedAt || Date.now();
}

function applyBaiduCallbackSession(): void {
  if (route.query.baidu !== "connected" || typeof route.query.userId !== "string") {
    return;
  }

  authStore.setCurrentUser(
    route.query.userId,
    typeof route.query.displayName === "string" ? route.query.displayName : undefined
  );

  const cleanedQuery = { ...route.query };
  delete cleanedQuery.baidu;
  delete cleanedQuery.userId;
  delete cleanedQuery.displayName;

  void router.replace({
    path: route.path,
    query: cleanedQuery,
    hash: route.hash
  });
}
</script>
