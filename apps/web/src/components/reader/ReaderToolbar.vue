<template>
  <div class="toolbar" aria-label="阅读工具">
    <button class="button secondary" type="button" @click="$emit('decreaseFont')">A-</button>
    <button class="button secondary" type="button" @click="$emit('increaseFont')">A+</button>
    <button class="button secondary" type="button" @click="$emit('toggleTheme')">主题</button>
  </div>
</template>

<script setup lang="ts">
defineEmits<{
  decreaseFont: [];
  increaseFont: [];
  toggleTheme: [];
}>();
</script>
