<template>
  <section>
    <ReaderToolbar
      :can-previous="hasPreviousChapter"
      :can-next="hasNextChapter"
      :progress-label="progressLabel"
      :saving="savingProgress"
      @previous-chapter="goToPreviousChapter"
      @next-chapter="goToNextChapter"
      @decrease-font="settings.decreaseFontSize"
      @increase-font="settings.increaseFontSize"
      @toggle-theme="settings.toggleTheme"
    />

    <div v-if="loading" class="panel reader-message">正在加载章节...</div>

    <EmptyState v-else-if="error" title="章节加载失败" :description="error" />

    <EmptyState v-else-if="!chapters.length" title="暂无章节" description="当前书籍还没有可阅读的章节。" />

    <article
      v-else-if="currentChapter"
      class="reader-surface"
      :class="readerThemeClass"
      :style="{
        '--reader-font-size': `${settings.fontSize}px`,
        '--reader-line-height': settings.lineHeight
      }"
    >
      <p class="reader-kicker">{{ progressLabel }}</p>
      <h1>{{ currentChapter.title }}</h1>
      <div class="reader-content">{{ currentChapter.content }}</div>
    </article>

    <footer v-if="currentChapter" class="reader-pagination">
      <button class="button secondary" type="button" :disabled="!hasPreviousChapter" @click="goToPreviousChapter">上一章</button>
      <span>{{ Math.round(progressPercent) }}%</span>
      <button class="button secondary" type="button" :disabled="!hasNextChapter" @click="goToNextChapter">下一章</button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import type { Chapter, ChapterContent, ReadingProgress } from "shared";
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import EmptyState from "../components/common/EmptyState.vue";
import ReaderToolbar from "../components/reader/ReaderToolbar.vue";
import { getChapter, getProgress, listChapters, saveProgress } from "../services/reader.api";
import { useReaderStore } from "../stores/reader.store";
import { useReaderSettingsStore } from "../stores/settings.store";

const route = useRoute();
const router = useRouter();
const settings = useReaderSettingsStore();
const reader = useReaderStore();

const chapters = ref<Chapter[]>([]);
const currentChapter = ref<ChapterContent>();
const loading = ref(true);
const savingProgress = ref(false);
const error = ref<string>();

const bookId = computed(() => routeParam(route.params.bookId) ?? "");
const chapterId = computed(() => routeParam(route.params.chapterId));
const currentChapterIndex = computed(() => chapters.value.findIndex((chapter) => chapter.id === currentChapter.value?.id));
const hasPreviousChapter = computed(() => currentChapterIndex.value > 0);
const hasNextChapter = computed(() => currentChapterIndex.value >= 0 && currentChapterIndex.value < chapters.value.length - 1);
const progressPercent = computed(() => {
  if (!chapters.value.length || currentChapterIndex.value < 0) {
    return 0;
  }

  return ((currentChapterIndex.value + 1) / chapters.value.length) * 100;
});
const progressLabel = computed(() =>
  currentChapterIndex.value >= 0 ? `第 ${currentChapterIndex.value + 1} / ${chapters.value.length} 章` : "未选择章节"
);
const readerThemeClass = computed(() => `reader-theme-${settings.theme}`);

let loadRequestId = 0;
let saveRequestId = 0;

watch(
  [bookId, chapterId],
  () => {
    void loadReader();
  },
  { immediate: true }
);

async function loadReader(): Promise<void> {
  const requestId = ++loadRequestId;
  loading.value = true;
  error.value = undefined;

  try {
    const [chapterPage, savedProgress] = await Promise.all([listChapters(bookId.value), getSavedProgress(bookId.value)]);
    const sortedChapters = [...chapterPage.items].sort((left, right) => left.chapterIndex - right.chapterIndex);

    if (requestId !== loadRequestId) {
      return;
    }

    chapters.value = sortedChapters;

    const selectedChapterId = selectChapterId(sortedChapters, chapterId.value, savedProgress?.chapterId);
    if (!selectedChapterId) {
      currentChapter.value = undefined;
      return;
    }

    if (selectedChapterId !== chapterId.value) {
      await router.replace({ name: "reader", params: { bookId: bookId.value, chapterId: selectedChapterId } });
      return;
    }

    currentChapter.value = await getChapter(bookId.value, selectedChapterId);

    if (requestId !== loadRequestId) {
      return;
    }

    void recordProgress();
    window.scrollTo({ top: 0 });
  } catch (cause) {
    if (requestId === loadRequestId) {
      currentChapter.value = undefined;
      error.value = cause instanceof Error ? cause.message : "章节暂时无法读取";
    }
  } finally {
    if (requestId === loadRequestId) {
      loading.value = false;
    }
  }
}

async function getSavedProgress(targetBookId: string): Promise<ReadingProgress | undefined> {
  try {
    return await getProgress(targetBookId);
  } catch {
    return undefined;
  }
}

function selectChapterId(items: Chapter[], routeChapterId: string | undefined, progressChapterId: string | undefined): string | undefined {
  if (!items.length) {
    return undefined;
  }

  const candidate = [routeChapterId, progressChapterId].find((id) => id && items.some((chapter) => chapter.id === id));
  return candidate ?? items[0].id;
}

function goToPreviousChapter(): void {
  goToChapter(currentChapterIndex.value - 1);
}

function goToNextChapter(): void {
  goToChapter(currentChapterIndex.value + 1);
}

function goToChapter(index: number): void {
  const target = chapters.value[index];

  if (!target) {
    return;
  }

  void router.push({ name: "reader", params: { bookId: bookId.value, chapterId: target.id } });
}

async function recordProgress(): Promise<void> {
  if (!currentChapter.value) {
    return;
  }

  const requestId = ++saveRequestId;
  const progress = {
    bookId: bookId.value,
    chapterId: currentChapter.value.id,
    scrollPosition: 0,
    progressPercent: progressPercent.value
  };

  reader.setProgress(progress);
  savingProgress.value = true;

  try {
    await saveProgress(bookId.value, progress);
  } catch {
    // Reading should not fail just because progress persistence is temporarily unavailable.
  } finally {
    if (requestId === saveRequestId) {
      savingProgress.value = false;
    }
  }
}

function routeParam(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return routeParam(value[0]);
  }

  return typeof value === "string" ? value : undefined;
}
</script>
