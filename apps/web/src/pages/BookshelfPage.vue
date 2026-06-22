<template>
  <section class="bookshelf-page">
    <header class="bookshelf-header">
      <div>
        <h1>书架</h1>
        <p>共 {{ totalCount }} 本 · {{ readingCount }} 本在读</p>
      </div>
      <RouterLink class="button add-book-button" to="/netdisk">+ 添加书籍</RouterLink>
    </header>

    <section class="sync-strip" :class="{ 'sync-strip-error': importSyncStore.error }">
      <div>
        <strong>{{ syncTitle }}</strong>
        <span>{{ syncDescription }}</span>
      </div>
      <button class="button secondary" type="button" :disabled="importSyncStore.loading" @click="manualSync">
        {{ importSyncStore.loading ? "同步中" : "立即同步" }}
      </button>
    </section>

    <div class="bookshelf-controls">
      <label class="book-search">
        <span>⌕</span>
        <input v-model="keyword" placeholder="搜索书名、作者、标签..." />
      </label>

      <div class="pill-row">
        <button
          v-for="option in statusOptions"
          :key="option.value || 'all'"
          class="filter-pill"
          :class="{ active: status === option.value }"
          type="button"
          @click="status = option.value"
        >
          {{ option.label }} <span>{{ option.count }}</span>
        </button>
      </div>

      <div class="filter-controls">
        <label class="rating-filter">
          <span class="facet-label">评分</span>
          <input v-model.number="ratingMinimum" type="range" min="0" max="10" step="0.5" />
          <strong>{{ ratingLabel }}</strong>
        </label>

        <label v-if="tags.length" class="tag-select-filter">
          <span class="facet-label">标签</span>
          <select v-model="selectedTag">
            <option value="">全部标签</option>
            <option v-for="tag in tags" :key="tag.id" :value="tag.name">{{ tag.name }}</option>
          </select>
        </label>
      </div>

      <button v-if="filtersActive" class="clear-filter-button" type="button" @click="resetFilters">清空筛选</button>
    </div>
    <p v-if="tagError" class="error-text">{{ tagError }}</p>

    <p v-if="booksStore.loading" class="muted">正在加载书架...</p>
    <section v-else-if="booksStore.error" class="panel state-panel">
      <h2>书架加载失败</h2>
      <p class="error-text">{{ booksStore.error }}</p>
      <button class="button secondary" type="button" @click="loadBooks">重试</button>
    </section>

    <div v-else-if="books.length" class="grid">
      <BookCard v-for="book in books" :key="book.id" :book="book" />
    </div>

    <EmptyState
      v-else-if="filtersActive"
      title="没有匹配的书"
      description="换一个状态、评分或关键词试试。"
      action="清空筛选"
      @action="resetFilters"
    />

    <EmptyState
      v-else
      title="书架还是空的"
      description="先从百度网盘扫描 TXT 小说，再导入到你的私人书架。"
      action="去扫描"
      to="/netdisk"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Book, BookSearchQuery, BookStatus, Tag } from "shared";
import BookCard from "../components/book/BookCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { listBooks } from "../services/books.api";
import { useBooksStore } from "../stores/books.store";
import { useImportSyncStore } from "../stores/import-sync.store";
import { listTags } from "../services/tags.api";

const booksStore = useBooksStore();
const importSyncStore = useImportSyncStore();
const keyword = ref("");
const status = ref("");
const ratingMinimum = ref(0);
const selectedTag = ref("");
const tags = ref<Tag[]>([]);
const statsBooks = ref<Book[]>([]);
const tagError = ref<string>();

const books = computed(() => booksStore.books);
const totalCount = computed(() => statsBooks.value.length || books.value.length);
const readingCount = computed(() => statsBooks.value.filter((book) => book.status === "reading").length);
const filtersActive = computed(() => Boolean(keyword.value.trim() || status.value || ratingMinimum.value > 0 || selectedTag.value));
const ratingQuery = computed(() => {
  const minimum = Number(ratingMinimum.value);
  return Number.isFinite(minimum) && minimum > 0 ? { minRating: minimum } : {};
});
const statusOptions = computed(() => [
  { value: "", label: "全部", count: totalCount.value },
  { value: "reading", label: "在读", count: countStatus("reading") },
  { value: "finished", label: "已读", count: countStatus("finished") },
  { value: "dropped", label: "弃读", count: countStatus("dropped") },
  { value: "not_started", label: "想读", count: countStatus("not_started") }
]);
const ratingLabel = computed(() => (ratingMinimum.value > 0 ? `${ratingMinimum.value.toFixed(1)} 分+` : "全部"));
const syncTitle = computed(() => {
  if (importSyncStore.loading) {
    return "正在扫描 /小说";
  }

  if (importSyncStore.error) {
    return "自动同步未完成";
  }

  if (importSyncStore.result) {
    return importSyncStore.result.imported.length > 0
      ? `已自动导入 ${importSyncStore.result.imported.length} 本新书`
      : "书架已是最新";
  }

  return "自动同步 /小说";
});
const syncDescription = computed(() => {
  if (importSyncStore.error) {
    return importSyncStore.error;
  }

  if (importSyncStore.result) {
    const { candidateCount, skipped, failed } = importSyncStore.result;
    return `发现 ${candidateCount} 个 TXT，${skipped.length} 个已在书架${failed.length ? `，${failed.length} 个失败` : ""}`;
  }

  return "打开网站或切回网站时，会自动扫描百度网盘 /小说 并导入新增 TXT。";
});

void loadTags();
void loadStatsBooks();

watch(
  [keyword, status, ratingMinimum, selectedTag],
  () => {
    void loadBooks();
  },
  { immediate: true }
);

watch(
  () => importSyncStore.lastCompletedAt,
  async (completedAt) => {
    if (!completedAt) {
      return;
    }

    await loadStatsBooks();
    await loadBooks();
  }
);

async function loadBooks(): Promise<void> {
  const query: BookSearchQuery = {
    q: keyword.value.trim() || undefined,
    status: (status.value || undefined) as BookStatus | undefined,
    tag: selectedTag.value || undefined,
    ...ratingQuery.value
  };

  try {
    await booksStore.fetchBooks(query);
  } catch {
    // The store owns the visible error state.
  }
}

async function loadStatsBooks(): Promise<void> {
  try {
    const result = await listBooks();
    statsBooks.value = result.items;
  } catch {
    // The main list request owns visible loading errors.
  }
}

async function loadTags(): Promise<void> {
  tagError.value = undefined;

  try {
    const result = await listTags();
    tags.value = result.items;
  } catch (error) {
    tagError.value = error instanceof Error ? error.message : "标签加载失败";
  }
}

function resetFilters(): void {
  keyword.value = "";
  status.value = "";
  ratingMinimum.value = 0;
  selectedTag.value = "";
}

async function manualSync(): Promise<void> {
  try {
    await importSyncStore.sync({ force: true });
  } catch {
    // The sync strip owns the visible error state.
  }
}

function countStatus(bookStatus: BookStatus): number {
  return statsBooks.value.filter((book) => book.status === bookStatus).length;
}
</script>
