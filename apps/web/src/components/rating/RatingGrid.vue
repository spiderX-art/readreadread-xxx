<template>
  <div class="grid">
    <label v-for="field in RATING_FIELDS" :key="field" class="panel">
      <span>{{ ratingFieldLabels[field] }}</span>
      <input class="text-input" type="number" min="1" max="10" step="0.5" />
    </label>
  </div>
</template>

<script setup lang="ts">
import { RATING_FIELDS } from "shared";
import { ratingFieldLabels } from "../../utils/format";
</script>
