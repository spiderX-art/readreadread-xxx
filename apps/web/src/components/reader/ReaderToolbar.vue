<template>
  <div class="toolbar reader-toolbar" aria-label="阅读工具">
    <button
      class="button secondary icon-button"
      type="button"
      title="上一章"
      :disabled="!canPrevious"
      @click="$emit('previousChapter')"
    >
      ‹
    </button>
    <span class="reader-toolbar-status">{{ progressLabel }}</span>
    <button class="button secondary icon-button" type="button" title="下一章" :disabled="!canNext" @click="$emit('nextChapter')">
      ›
    </button>
    <span class="reader-toolbar-spacer"></span>
    <button class="button secondary" type="button" @click="$emit('decreaseFont')">A-</button>
    <button class="button secondary" type="button" @click="$emit('increaseFont')">A+</button>
    <button class="button secondary" type="button" @click="$emit('toggleTheme')">主题</button>
    <span v-if="saving" class="reader-toolbar-status">保存中</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  canPrevious?: boolean;
  canNext?: boolean;
  progressLabel?: string;
  saving?: boolean;
}>();

defineEmits<{
  previousChapter: [];
  nextChapter: [];
  decreaseFont: [];
  increaseFont: [];
  toggleTheme: [];
}>();
</script>
