<template>
  <li class="panel netdisk-file-row">
    <span class="file-type-icon" aria-hidden="true">
      <Folder v-if="file.isDir" />
      <FileText v-else />
    </span>
    <div class="netdisk-file-main">
      <div class="file-title-row">
        <strong>{{ file.name }}</strong>
        <span v-if="file.imported" class="tag">已导入</span>
      </div>
      <p class="book-meta">{{ file.isDir ? "文件夹" : `${formatFileSize(file.size)} · ${file.path}` }}</p>
    </div>
    <button class="button secondary" type="button" @click="$emit('select', file)">
      {{ buttonText }}
    </button>
  </li>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FileText, Folder } from "@lucide/vue";
import type { NetdiskFile } from "shared";
import { formatFileSize } from "../../utils/format";

const props = defineProps<{
  file: NetdiskFile;
}>();

defineEmits<{
  select: [file: NetdiskFile];
}>();

const buttonText = computed(() => {
  if (props.file.isDir) {
    return "进入";
  }

  return props.file.imported ? "查看" : "导入";
});
</script>
