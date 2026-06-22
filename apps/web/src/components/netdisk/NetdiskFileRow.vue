<template>
  <li class="panel netdisk-file-row">
    <div>
      <strong>{{ file.name }}</strong>
      <p class="book-meta">{{ file.isDir ? "文件夹" : `${formatFileSize(file.size)} · ${file.path}` }}</p>
    </div>
    <button class="button secondary" type="button" @click="$emit('select', file)">
      {{ file.isDir ? "进入" : "导入" }}
    </button>
  </li>
</template>

<script setup lang="ts">
import type { NetdiskFile } from "shared";
import { formatFileSize } from "../../utils/format";

defineProps<{
  file: NetdiskFile;
}>();

defineEmits<{
  select: [file: NetdiskFile];
}>();
</script>
