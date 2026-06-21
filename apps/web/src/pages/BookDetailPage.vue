<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ book?.title ?? "书籍详情" }}</h1>
        <p>{{ book?.author ?? "作者待识别" }}</p>
      </div>
      <RouterLink class="button" :to="`/books/${bookId}/read`">继续阅读</RouterLink>
    </header>

    <div class="grid">
      <section class="panel">
        <h2>阅读状态</h2>
        <p>{{ book ? bookStatusLabels[book.status] : "未开始" }}</p>
      </section>

      <section class="panel">
        <h2>评分</h2>
        <RatingGrid />
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import RatingGrid from "../components/rating/RatingGrid.vue";
import { useBooksStore } from "../stores/books.store";
import { bookStatusLabels } from "../utils/format";

const route = useRoute();
const booksStore = useBooksStore();
const bookId = computed(() => String(route.params.bookId));
const book = computed(() => booksStore.byId(bookId.value));
</script>
