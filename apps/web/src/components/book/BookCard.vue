<template>
  <article class="book-card">
    <div>
      <h2>{{ book.title }}</h2>
      <p class="book-meta">{{ book.author || "未知作者" }} · {{ statusLabel }}</p>
    </div>

    <div class="tag-list">
      <span class="tag">{{ book.chapterCount }} 章</span>
      <span v-if="book.rating" class="tag">{{ book.rating.toFixed(1) }} 分</span>
      <span v-for="tag in book.tags ?? []" :key="tag.id" class="tag book-tag">{{ tag.name }}</span>
    </div>

    <RouterLink class="button secondary" :to="`/books/${book.id}`">查看详情</RouterLink>
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
</script>
