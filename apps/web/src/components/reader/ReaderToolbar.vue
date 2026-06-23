<template>
  <div class="toolbar reader-toolbar" aria-label="阅读工具">
    <button
      class="button secondary icon-button"
      type="button"
      title="上一章"
      :disabled="!canPrevious"
      @click="$emit('previousChapter')"
    >
      <ChevronLeft aria-hidden="true" />
    </button>
    <span class="reader-toolbar-status">{{ progressLabel }}</span>
    <button class="button secondary icon-button" type="button" title="下一章" :disabled="!canNext" @click="$emit('nextChapter')">
      <ChevronRight aria-hidden="true" />
    </button>
    <span class="reader-toolbar-spacer"></span>
    <button class="button secondary" type="button" @click="$emit('decreaseFont')">A-</button>
    <button class="button secondary" type="button" @click="$emit('increaseFont')">A+</button>
    <div class="reader-theme-control" aria-label="阅读主题">
      <button
        v-for="option in themeOptions"
        :key="option.value"
        class="theme-segment"
        :class="{ active: props.theme === option.value }"
        type="button"
        @click="$emit('setTheme', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    <span v-if="saving" class="reader-toolbar-status">保存中</span>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/vue";
import type { ReaderTheme } from "../../stores/settings.store";

const props = defineProps<{
  canPrevious?: boolean;
  canNext?: boolean;
  progressLabel?: string;
  theme: ReaderTheme;
  saving?: boolean;
}>();

defineEmits<{
  previousChapter: [];
  nextChapter: [];
  decreaseFont: [];
  increaseFont: [];
  setTheme: [theme: ReaderTheme];
}>();

const themeOptions: { value: ReaderTheme; label: string }[] = [
  { value: "paper", label: "纸" },
  { value: "kindle", label: "墨" },
  { value: "green", label: "绿" },
  { value: "night", label: "夜" }
];
</script>
