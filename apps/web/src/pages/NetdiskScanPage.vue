<template>
  <section>
    <header class="page-header netdisk-header">
      <div>
        <h1>网盘扫描</h1>
        <p>浏览网盘目录，筛选 TXT 文件，选择后进入导入确认。</p>
      </div>
      <button class="button secondary" type="button">导入说明</button>
    </header>

    <div class="toolbar">
      <input v-model="path" class="search-input" placeholder="/小说" />
      <button class="button" type="button" :disabled="loading" @click="scanDirectory">
        {{ loading ? "扫描中" : "扫描目录" }}
      </button>
      <select class="select-input" aria-label="文件类型">
        <option>TXT 文件</option>
      </select>
      <input v-model="keyword" class="search-input" placeholder="搜索 TXT 文件" />
      <button class="button secondary" type="button" :disabled="loading || !keyword.trim()" @click="searchFiles">搜索</button>
    </div>

    <div class="netdisk-subbar">
      <span>⌂ 百度网盘 / {{ normalizedPathLabel }}</span>
      <span>共 {{ files.length }} 项</span>
      <button class="icon-button button secondary" type="button" aria-label="网格视图">▦</button>
      <button class="icon-button button secondary" type="button" aria-label="列表视图">☷</button>
      <button class="icon-button button secondary" type="button" aria-label="刷新" @click="scanDirectory">↻</button>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="loading" class="muted">正在读取百度网盘...</p>

    <ul v-else-if="files.length" class="file-list">
      <NetdiskFileRow v-for="file in files" :key="file.fsId" :file="file" @select="handleFileSelect" />
    </ul>

    <EmptyState v-else title="暂无文件" description="授权后可读取网盘目录并显示 TXT 文件。" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { NetdiskFile } from "shared";
import EmptyState from "../components/common/EmptyState.vue";
import NetdiskFileRow from "../components/netdisk/NetdiskFileRow.vue";
import { ApiError } from "../services/api";
import { listNetdiskFiles, searchNetdiskFiles } from "../services/netdisk.api";

const router = useRouter();
const route = useRoute();
const path = ref("/");
const keyword = ref("");
const files = ref<NetdiskFile[]>([]);
const loading = ref(false);
const error = ref<string>();
const normalizedPathLabel = computed(() => path.value.replace(/^\/+/, "") || "/");

void scanDirectory();

async function scanDirectory(): Promise<void> {
  loading.value = true;
  error.value = undefined;

  try {
    const result = await listNetdiskFiles(path.value || "/");
    path.value = result.path;
    files.value = result.files;
  } catch (scanError) {
    if (await redirectToBaiduAuthIfNeeded(scanError)) {
      return;
    }

    error.value = scanError instanceof Error ? scanError.message : "网盘目录扫描失败";
  } finally {
    loading.value = false;
  }
}

async function searchFiles(): Promise<void> {
  loading.value = true;
  error.value = undefined;

  try {
    const result = await searchNetdiskFiles(keyword.value.trim(), path.value || "/");
    files.value = result.files;
  } catch (scanError) {
    if (await redirectToBaiduAuthIfNeeded(scanError)) {
      return;
    }

    error.value = scanError instanceof Error ? scanError.message : "网盘搜索失败";
  } finally {
    loading.value = false;
  }
}

function handleFileSelect(file: NetdiskFile): void {
  if (file.isDir) {
    path.value = file.path;
    void scanDirectory();
    return;
  }

  if (file.imported && file.bookId) {
    void router.push({ name: "book-detail", params: { bookId: file.bookId } });
    return;
  }

  void router.push({
    name: "import-confirm",
    query: {
      sourceFileId: file.fsId,
      sourcePath: file.path,
      fileName: file.name,
      fileSize: String(file.size)
    }
  });
}

async function redirectToBaiduAuthIfNeeded(error: unknown): Promise<boolean> {
  if (!(error instanceof ApiError) || !["BAIDU_NOT_AUTHORIZED", "UNAUTHORIZED"].includes(error.code)) {
    return false;
  }

  await router.push({
    name: "auth",
    query: {
      auto: "1",
      returnTo: route.fullPath
    }
  });
  return true;
}
</script>
