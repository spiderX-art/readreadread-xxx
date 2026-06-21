<template>
  <section class="panel">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <RouterLink v-if="to" class="button" :to="to">{{ action }}</RouterLink>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  action?: string;
  to?: string;
}>();
</script>
