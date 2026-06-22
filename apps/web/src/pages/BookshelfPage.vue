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
        <option value="reading">在读</option>
        <option value="finished">已读完</option>
        <option value="dropped">弃读</option>
      </select>
    </div>

    <p v-if="booksStore.loading" class="muted">正在加载书架...</p>
    <p v-else-if="booksStore.error" class="error-text">{{ booksStore.error }}</p>

    <div v-else-if="books.length" class="grid">
      <BookCard v-for="book in books" :key="book.id" :book="book" />
    </div>

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
import type { BookStatus } from "shared";
import BookCard from "../components/book/BookCard.vue";
import EmptyState from "../components/common/EmptyState.vue";
import { useBooksStore } from "../stores/books.store";

const booksStore = useBooksStore();
const keyword = ref("");
const status = ref("");

const books = computed(() => booksStore.books);

watch(
  [keyword, status],
  () => {
    void booksStore.fetchBooks({
      q: keyword.value.trim() || undefined,
      status: (status.value || undefined) as BookStatus | undefined
    });
  },
  { immediate: true }
);
</script>
