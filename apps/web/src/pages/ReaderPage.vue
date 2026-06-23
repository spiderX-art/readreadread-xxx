<template>
  <section class="reader-page" :class="readerPageThemeClass">
    <ReaderToolbar
      :can-previous="hasPreviousChapter"
      :can-next="hasNextChapter"
      :progress-label="progressLabel"
      :theme="settings.theme"
      :saving="savingProgress"
      @previous-chapter="goToPreviousChapter"
      @next-chapter="goToNextChapter"
      @decrease-font="settings.decreaseFontSize"
      @increase-font="settings.increaseFontSize"
      @set-theme="settings.setTheme"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
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
const searchPosition = computed(() => routeNumberQuery(route.query.position));
const currentChapterIndex = computed(() => chapters.value.findIndex((chapter) => chapter.id === currentChapter.value?.id));
const hasPreviousChapter = computed(() => currentChapterIndex.value > 0);
const hasNextChapter = computed(() => currentChapterIndex.value >= 0 && currentChapterIndex.value < chapters.value.length - 1);
const progressPercent = ref(0);
const progressLabel = computed(() =>
  currentChapterIndex.value >= 0 ? `第 ${currentChapterIndex.value + 1} / ${chapters.value.length} 章` : "未选择章节"
);
const readerThemeClass = computed(() => `reader-theme-${settings.theme}`);
const readerPageThemeClass = computed(() => `reader-page-${settings.theme}`);

const SCROLL_SAVE_THROTTLE_MS = 800;

let loadRequestId = 0;
let saveRequestId = 0;
let scrollSaveTimer: number | undefined;
let hasPendingScrollSave = false;
let isRestoringScroll = false;

watch(
  [bookId, chapterId, searchPosition],
  async () => {
    await flushProgressSave();
    await loadReader();
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  void flushProgressSave();
});

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
      progressPercent.value = 0;
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

    const savedScrollPosition = savedProgress?.chapterId === selectedChapterId ? savedProgress.scrollPosition : 0;
    await restoreScrollPosition(() => getSearchResultScrollPosition(currentChapter.value?.content ?? "", searchPosition.value) ?? savedScrollPosition);
    void recordProgress();
  } catch (cause) {
    if (requestId === loadRequestId) {
      currentChapter.value = undefined;
      progressPercent.value = 0;
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

  void flushProgressSave().finally(() => {
    void router.push({ name: "reader", params: { bookId: bookId.value, chapterId: target.id } });
  });
}

async function recordProgress(): Promise<void> {
  if (!currentChapter.value) {
    return;
  }

  const requestId = ++saveRequestId;
  const scrollPosition = getScrollPosition();
  const nextProgressPercent = getProgressPercent(scrollPosition);
  const progress = {
    bookId: bookId.value,
    chapterId: currentChapter.value.id,
    scrollPosition,
    progressPercent: nextProgressPercent
  };

  progressPercent.value = nextProgressPercent;
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

function handleScroll(): void {
  if (loading.value || isRestoringScroll) {
    return;
  }

  updateLocalProgress();
  scheduleProgressSave();
}

function handleVisibilityChange(): void {
  if (document.visibilityState === "hidden") {
    void flushProgressSave();
  }
}

function scheduleProgressSave(): void {
  if (!currentChapter.value) {
    return;
  }

  hasPendingScrollSave = true;

  if (scrollSaveTimer !== undefined) {
    return;
  }

  scrollSaveTimer = window.setTimeout(() => {
    scrollSaveTimer = undefined;

    if (!hasPendingScrollSave) {
      return;
    }

    hasPendingScrollSave = false;
    void recordProgress();
  }, SCROLL_SAVE_THROTTLE_MS);
}

async function flushProgressSave(): Promise<void> {
  if (scrollSaveTimer !== undefined) {
    window.clearTimeout(scrollSaveTimer);
    scrollSaveTimer = undefined;
  }

  hasPendingScrollSave = false;

  if (currentChapter.value) {
    await recordProgress();
  }
}

async function restoreScrollPosition(scrollPosition: number | (() => number)): Promise<void> {
  isRestoringScroll = true;
  await nextTick();
  const resolvedScrollPosition = typeof scrollPosition === "function" ? scrollPosition() : scrollPosition;
  window.scrollTo({ top: Math.max(0, Math.round(resolvedScrollPosition)) });
  await waitForNextFrame();
  updateLocalProgress();
  isRestoringScroll = false;
}

function updateLocalProgress(): void {
  if (!currentChapter.value) {
    return;
  }

  const scrollPosition = getScrollPosition();
  const nextProgressPercent = getProgressPercent(scrollPosition);
  progressPercent.value = nextProgressPercent;
  reader.setProgress({
    bookId: bookId.value,
    chapterId: currentChapter.value.id,
    scrollPosition,
    progressPercent: nextProgressPercent
  });
}

function getScrollPosition(): number {
  return Math.max(0, Math.round(window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0));
}

function getProgressPercent(scrollPosition: number): number {
  if (!chapters.value.length || currentChapterIndex.value < 0) {
    return 0;
  }

  const maxScrollPosition = getMaxScrollPosition();
  const chapterScrollPercent = maxScrollPosition > 0 ? Math.min(1, Math.max(0, scrollPosition / maxScrollPosition)) : 1;
  return Math.min(100, Math.max(0, ((currentChapterIndex.value + chapterScrollPercent) / chapters.value.length) * 100));
}

function getMaxScrollPosition(): number {
  const scrollingElement = document.scrollingElement ?? document.documentElement;
  return Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function getSearchResultScrollPosition(content: string, position: number | undefined): number | undefined {
  if (position === undefined || !content.length) {
    return undefined;
  }

  const maxScrollPosition = getMaxScrollPosition();

  if (maxScrollPosition <= 0) {
    return 0;
  }

  const ratio = Math.min(1, Math.max(0, position / content.length));
  return Math.max(0, Math.round(maxScrollPosition * ratio) - 120);
}

function routeParam(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return routeParam(value[0]);
  }

  return typeof value === "string" ? value : undefined;
}

function routeNumberQuery(value: unknown): number | undefined {
  const rawValue = routeParam(value);

  if (rawValue === undefined) {
    return undefined;
  }

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : undefined;
}
</script>
