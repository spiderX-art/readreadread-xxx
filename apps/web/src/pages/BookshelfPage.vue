<template>
  <section>
    <header class="page-header">
      <div>
        <h1>私人书架</h1>
        <p>管理从网盘导入的小说，记录阅读状态、评分、标签和书评。</p>
      </div>
      <RouterLink class="button" to="/netdisk">扫描网盘</RouterLink>
    </header>

    <div class="toolbar">
      <input v-model="keyword" class="search-input" placeholder="搜索书名或作者" />
      <select v-model="status" class="select-input">
        <option value="">全部状态</option>
        <option v-for="bookStatus in BOOK_STATUSES" :key="bookStatus" :value="bookStatus">
          {{ bookStatusLabels[bookStatus] }}
        </option>
      </select>
      <select v-model="ratingRange" class="select-input">
        <option value="">全部评分</option>
        <option value="9">9 分及以上</option>
        <option value="8">8 分及以上</option>
        <option value="7">7 分及以上</option>
        <option value="6">6 分及以上</option>
      </select>
      <button v-if="filtersActive" class="button secondary" type="button" @click="resetFilters">清空筛选</button>
    </div>

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
import { BOOK_STATUSES, type BookSearchQuery, type BookStatus } from "shared";
import BookCard from "../components/book/BookCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { useBooksStore } from "../stores/books.store";
import { bookStatusLabels } from "../utils/format";

const booksStore = useBooksStore();
const keyword = ref("");
const status = ref("");
const ratingRange = ref("");

const books = computed(() => booksStore.books);
const filtersActive = computed(() => Boolean(keyword.value.trim() || status.value || ratingRange.value));
const ratingQuery = computed(() => {
  const minimum = Number(ratingRange.value);
  return Number.isFinite(minimum) && minimum > 0 ? { minRating: minimum } : {};
});

watch(
  [keyword, status, ratingRange],
  () => {
    void loadBooks();
  },
  { immediate: true }
);

async function loadBooks(): Promise<void> {
  const query: BookSearchQuery = {
    q: keyword.value.trim() || undefined,
    status: (status.value || undefined) as BookStatus | undefined,
    ...ratingQuery.value
  };

  try {
    await booksStore.fetchBooks(query);
  } catch {
    // The store owns the visible error state.
  }
}

function resetFilters(): void {
  keyword.value = "";
  status.value = "";
  ratingRange.value = "";
}
</script>
