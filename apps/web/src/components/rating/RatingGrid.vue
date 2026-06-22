<template>
  <div class="form-grid">
    <label v-for="field in RATING_FIELDS" :key="field" class="rating-field">
      <span>{{ ratingFieldLabels[field] }}</span>
      <input v-model="values[field]" class="text-input" type="number" min="1" max="10" step="0.5" />
    </label>
    <p v-if="error" class="error-text">{{ error }}</p>
    <button class="button secondary" type="button" :disabled="loading || saving" @click="save">
      {{ saving ? "保存中" : "保存评分" }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { RATING_FIELDS, type RatingField } from "shared";
import { getBookRating, saveBookRating } from "../../services/books.api";
import { ratingFieldLabels } from "../../utils/format";
import { isValidScore } from "../../utils/rating";

const props = defineProps<{
  bookId: string;
}>();
const emit = defineEmits<{
  saved: [];
}>();
const values = reactive(createEmptyValues());
const loading = ref(false);
const saving = ref(false);
const error = ref<string>();

watch(
  () => props.bookId,
  () => {
    void loadRating();
  },
  { immediate: true }
);

async function loadRating() {
  loading.value = true;
  error.value = undefined;

  try {
    const rating = await getBookRating(props.bookId);

    for (const field of RATING_FIELDS) {
      values[field] = rating?.[field] === undefined ? "" : String(rating[field]);
    }
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : "评分加载失败";
  } finally {
    loading.value = false;
  }
}

async function save() {
  const payload: Partial<Record<RatingField, number | null>> = {};

  for (const field of RATING_FIELDS) {
    const rawValue = values[field].trim();

    if (!rawValue) {
      payload[field] = null;
      continue;
    }

    const value = Number(rawValue);

    if (!isValidScore(value)) {
      error.value = `${ratingFieldLabels[field]}必须是 1-10 之间、步进 0.5 的数值`;
      return;
    }

    payload[field] = value;
  }

  saving.value = true;
  error.value = undefined;

  try {
    await saveBookRating(props.bookId, payload);
    emit("saved");
  } catch (saveError) {
    error.value = saveError instanceof Error ? saveError.message : "评分保存失败";
  } finally {
    saving.value = false;
  }
}

function createEmptyValues(): Record<RatingField, string> {
  return Object.fromEntries(RATING_FIELDS.map((field) => [field, ""])) as Record<RatingField, string>;
}
</script>
