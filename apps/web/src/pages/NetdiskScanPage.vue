<template>
  <section>
    <header class="page-header">
      <div>
        <h1>网盘扫描</h1>
        <p>浏览网盘目录，筛选 TXT 文件，选择后进入导入确认。</p>
      </div>
    </header>

    <div class="toolbar">
      <input v-model="path" class="search-input" placeholder="/小说" />
      <button class="button" type="button" :disabled="loading" @click="scanDirectory">
        {{ loading ? "扫描中" : "扫描目录" }}
      </button>
      <input v-model="keyword" class="search-input" placeholder="搜索 TXT 文件" />
      <button class="button secondary" type="button" :disabled="loading || !keyword.trim()" @click="searchFiles">搜索</button>
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
import { ref } from "vue";
import { useRouter } from "vue-router";
import type { NetdiskFile } from "shared";
import EmptyState from "../components/common/EmptyState.vue";
import NetdiskFileRow from "../components/netdisk/NetdiskFileRow.vue";
import { listNetdiskFiles, searchNetdiskFiles } from "../services/netdisk.api";

const router = useRouter();
const path = ref("/");
const keyword = ref("");
const files = ref<NetdiskFile[]>([]);
const loading = ref(false);
const error = ref<string>();

void scanDirectory();

async function scanDirectory(): Promise<void> {
  loading.value = true;
  error.value = undefined;

  try {
    const result = await listNetdiskFiles(path.value || "/");
    path.value = result.path;
    files.value = result.files;
  } catch (scanError) {
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
</script>
