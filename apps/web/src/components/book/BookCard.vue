<template>
  <article class="book-card">
    <span class="status-badge" :class="`status-${book.status}`">{{ statusLabel }}</span>

    <div class="book-card-main">
      <h2>{{ book.title }}</h2>
      <p class="book-author">{{ book.author || "未知作者" }}</p>
    </div>

    <p class="book-meta">共 {{ book.chapterCount }} 章 · {{ formattedWordCount }} 字</p>
    <div class="rating-stars" aria-label="评分">
      <span v-for="index in 5" :key="index" :class="{ muted: index > starCount }">★</span>
    </div>

    <div class="tag-list">
      <span v-for="tag in book.tags ?? []" :key="tag.id" class="tag book-tag">{{ tag.name }}</span>
      <span v-if="!(book.tags?.length)" class="tag">未分类</span>
    </div>

    <p class="book-source">来源：{{ sourceLabel }}</p>

    <RouterLink class="button secondary book-detail-link" :to="`/books/${book.id}`">查看详情</RouterLink>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { Book } from "shared";
import { bookStatusLabels } from "../../utils/format";

const props = defineProps<{
  book: Book;
}>();

const statusLabel = computed(() => bookStatusLabels[props.book.status]);
const starCount = computed(() => Math.max(0, Math.min(5, Math.round((props.book.rating ?? 0) / 2))));
const formattedWordCount = computed(() => {
  if (!props.book.wordCount) {
    return "0";
  }

  return props.book.wordCount.toLocaleString("zh-CN");
});
const sourceLabel = computed(() => (props.book.sourcePath?.startsWith("/小说") ? "百度网盘" : "本地文件"));
</script>
