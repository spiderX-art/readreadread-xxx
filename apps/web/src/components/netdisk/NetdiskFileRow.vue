<template>
  <li class="panel">
    <strong>{{ file.name }}</strong>
    <span class="book-meta">{{ file.isDir ? "文件夹" : `${file.size} bytes` }}</span>
  </li>
</template>

<script setup lang="ts">
import type { NetdiskFile } from "shared";

defineProps<{
  file: NetdiskFile;
}>();
</script>
