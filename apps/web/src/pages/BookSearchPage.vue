<template>
  <section>
    <header class="page-header">
      <div>
        <h1>书内搜索</h1>
        <p>在当前小说的所有章节中搜索关键词，返回章节标题和上下文。</p>
      </div>
    </header>

    <div class="toolbar">
      <input class="search-input" placeholder="输入关键词" />
      <button class="button" type="button">搜索</button>
    </div>

    <EmptyState title="暂无结果" description="输入关键词后会从 R2 章节正文中检索。" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from "../components/common/EmptyState.vue";
</script>
