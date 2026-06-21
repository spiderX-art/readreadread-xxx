<template>
  <section>
    <ReaderToolbar
      @decrease-font="settings.decreaseFontSize"
      @increase-font="settings.increaseFontSize"
      @toggle-theme="settings.toggleTheme"
    />

    <article
      class="reader-surface"
      :style="{
        '--reader-font-size': `${settings.fontSize}px`,
        '--reader-line-height': settings.lineHeight
      }"
    >
      <h1>{{ chapterTitle }}</h1>
      <div class="reader-content">{{ content }}</div>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import ReaderToolbar from "../components/reader/ReaderToolbar.vue";
import { useReaderSettingsStore } from "../stores/settings.store";

const route = useRoute();
const settings = useReaderSettingsStore();

const chapterTitle = computed(() => String(route.params.chapterId ?? "序章"));
const content = "这里会显示解析后存储在 R2 的章节正文。\n\nV1 会继续接入章节切换、进度保存和移动端点击区域。";
</script>
