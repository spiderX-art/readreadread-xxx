<template>
  <section>
    <header class="page-header">
      <div>
        <h1>网盘扫描</h1>
        <p>浏览网盘目录，筛选 TXT 文件，选择后进入导入确认。</p>
      </div>
    </header>

    <div class="toolbar">
      <input class="search-input" placeholder="/小说" />
      <button class="button" type="button">扫描目录</button>
    </div>

    <EmptyState title="暂无文件" description="授权后可读取网盘目录并显示 TXT 文件。" />
  </section>
</template>

<script setup lang="ts">
import EmptyState from "../components/common/EmptyState.vue";
</script>
