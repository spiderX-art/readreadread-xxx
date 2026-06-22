<template>
  <section class="panel">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <RouterLink v-if="to" class="button" :to="to">{{ action }}</RouterLink>
    <button v-else-if="action" class="button" type="button" @click="$emit('action')">{{ action }}</button>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  action?: string;
  to?: string;
}>();

defineEmits<{
  action: [];
}>();
</script>
