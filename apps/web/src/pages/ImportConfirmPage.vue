<template>
  <section>
    <header class="page-header">
      <div>
        <h1>导入确认</h1>
        <p>检查自动识别的书名、作者和章节预览，确认后写入 D1 与 R2。</p>
      </div>
    </header>

    <p v-if="loading" class="muted">正在读取文件预览...</p>
    <section v-else-if="error" class="panel state-panel">
      <h2>导入预览失败</h2>
      <p class="error-text">{{ error }}</p>
      <RouterLink class="button secondary" to="/netdisk">返回网盘</RouterLink>
    </section>

    <form v-else class="panel form-grid" @submit.prevent="confirmImport">
      <p v-if="message" class="success-text">{{ message }}</p>
      <p v-if="actionError" class="error-text">{{ actionError }}</p>
      <p class="book-meta">{{ fileName }} · {{ formatFileSize(fileSize) }}</p>
      <label>
        书名
        <input v-model="title" class="text-input" />
      </label>
      <label>
        作者
        <input v-model="author" class="text-input" placeholder="未知作者" />
      </label>
      <div v-if="preview" class="form-grid">
        <p class="book-meta">预计 {{ preview.estimatedChapterCount }} 章</p>
        <div v-if="preview.sampleChapterTitles.length" class="tag-list">
          <span v-for="chapterTitle in preview.sampleChapterTitles" :key="chapterTitle" class="tag">
            {{ chapterTitle }}
          </span>
        </div>
      </div>
      <div class="form-row">
        <button class="button" type="submit" :disabled="importing || !title.trim()">
          {{ importing ? "导入中" : "确认导入" }}
        </button>
        <RouterLink class="button secondary" to="/netdisk">返回网盘</RouterLink>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { ImportPreview } from "shared";
import { ApiError } from "../services/api";
import { importTxtFromNetdisk, previewTxtImport, type ImportTxtRequest } from "../services/import.api";
import { formatFileSize } from "../utils/format";

const route = useRoute();
const router = useRouter();
const preview = ref<ImportPreview>();
const title = ref("");
const author = ref("");
const loading = ref(false);
const importing = ref(false);
const error = ref<string>();
const actionError = ref<string>();
const message = ref<string>();
const sourceFileId = computed(() => String(route.query.sourceFileId ?? ""));
const sourcePath = computed(() => String(route.query.sourcePath ?? ""));
const fileName = computed(() => String(route.query.fileName ?? ""));
const fileSize = computed(() => Number(route.query.fileSize ?? 0));

watch(
  () => route.query,
  () => {
    void loadPreview();
  },
  { immediate: true }
);

async function loadPreview(): Promise<void> {
  error.value = undefined;
  actionError.value = undefined;
  message.value = undefined;

  if (!sourceFileId.value || !sourcePath.value || !fileName.value) {
    error.value = "缺少导入文件信息";
    return;
  }

  loading.value = true;

  try {
    const result = await previewTxtImport(createRequest());
    preview.value = result;
    title.value = result.title;
    author.value = result.author ?? "";
  } catch (previewError) {
    error.value = previewError instanceof Error ? previewError.message : "导入预览失败";
  } finally {
    loading.value = false;
  }
}

async function confirmImport(): Promise<void> {
  importing.value = true;
  actionError.value = undefined;
  message.value = undefined;

  try {
    const result = await importTxtFromNetdisk({
      ...createRequest(),
      title: title.value,
      author: author.value || undefined
    });
    message.value = "导入成功";
    await router.push({ name: "book-detail", params: { bookId: result.book.id } });
  } catch (importError) {
    if (importError instanceof ApiError && importError.code === "BOOK_ALREADY_IMPORTED") {
      const bookId = getDuplicateBookId(importError.data);

      if (bookId) {
        await router.push({ name: "book-detail", params: { bookId } });
        return;
      }
    }

    actionError.value = importError instanceof Error ? importError.message : "导入失败";
  } finally {
    importing.value = false;
  }
}

function createRequest(): ImportTxtRequest {
  return {
    sourceFileId: sourceFileId.value,
    sourcePath: sourcePath.value,
    fileName: fileName.value,
    fileSize: Number.isFinite(fileSize.value) ? fileSize.value : 0
  };
}

function getDuplicateBookId(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("bookId" in data)) {
    return undefined;
  }

  const bookId = (data as { bookId?: unknown }).bookId;
  return typeof bookId === "string" && bookId ? bookId : undefined;
}
</script>
