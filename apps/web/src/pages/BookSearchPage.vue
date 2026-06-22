<template>
  <section>
    <header class="page-header">
      <div>
        <h1>书内搜索</h1>
        <p>在当前小说的所有章节中搜索关键词，返回章节标题和上下文。</p>
      </div>
    </header>

    <div class="toolbar">
      <input v-model="keyword" class="search-input" placeholder="输入关键词" @keydown.enter="search" />
      <button class="button" type="button" :disabled="loading || !keyword.trim()" @click="search">
        {{ loading ? "搜索中" : "搜索" }}
      </button>
    </div>

    <p v-if="error" class="error-text">{{ error }}</p>

    <div v-else-if="hits.length" class="grid">
      <RouterLink
        v-for="hit in hits"
        :key="`${hit.chapterId}-${hit.position}`"
        class="panel search-hit-card"
        :to="{
          name: 'reader',
          params: { bookId, chapterId: hit.chapterId },
          query: { position: String(hit.position), q: keyword.trim() }
        }"
      >
        <h2>{{ hit.chapterTitle }}</h2>
        <p class="book-meta">位置 {{ hit.position }}</p>
        <p>{{ hit.context }}</p>
      </RouterLink>
    </div>

    <EmptyState v-else title="暂无结果" description="输入关键词后会从 R2 章节正文中检索。" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import EmptyState from "../components/common/EmptyState.vue";
import { searchInsideBook, type BookSearchHit } from "../services/search.api";

const route = useRoute();
const bookId = computed(() => String(route.params.bookId));
const keyword = ref("");
const hits = ref<BookSearchHit[]>([]);
const loading = ref(false);
const error = ref<string>();

async function search() {
  const q = keyword.value.trim();

  if (!q) {
    hits.value = [];
    return;
  }

  loading.value = true;
  error.value = undefined;

  try {
    const result = await searchInsideBook(bookId.value, q);
    hits.value = result.items;
  } catch (searchError) {
    error.value = searchError instanceof Error ? searchError.message : "搜索失败";
  } finally {
    loading.value = false;
  }
}
</script>
