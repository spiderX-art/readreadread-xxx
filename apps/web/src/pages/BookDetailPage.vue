<template>
  <section>
    <header class="page-header">
      <div>
        <h1>{{ book?.title ?? "书籍详情" }}</h1>
        <p>{{ book?.author ?? "作者待识别" }}</p>
      </div>
      <div v-if="book" class="header-actions">
        <RouterLink class="button secondary" :to="`/books/${bookId}/search`">书内搜索</RouterLink>
        <RouterLink class="button" :to="`/books/${bookId}/read`">继续阅读</RouterLink>
      </div>
    </header>

    <p v-if="loading" class="muted">正在加载书籍详情...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <div v-else-if="book" class="grid">
      <section class="panel">
        <h2>阅读状态</h2>
        <p>{{ bookStatusLabels[book.status] }}</p>
        <div class="form-row">
          <select v-model="statusDraft" class="select-input">
            <option v-for="(label, value) in bookStatusLabels" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
          <button class="button secondary" type="button" :disabled="savingStatus" @click="saveStatus">
            {{ savingStatus ? "保存中" : "保存状态" }}
          </button>
        </div>
      </section>

      <section class="panel">
        <h2>书籍信息</h2>
        <p class="book-meta">{{ book.chapterCount }} 章 · {{ book.wordCount }} 字 · {{ book.fileName }}</p>
      </section>

      <section class="panel">
        <h2>评分</h2>
        <RatingGrid :book-id="bookId" @saved="refreshBook" />
      </section>

      <section class="panel">
        <h2>书评</h2>
        <div class="form-grid">
          <input v-model="reviewForm.shortComment" class="text-input" placeholder="短评" />
          <textarea v-model="reviewForm.fullReview" class="text-input textarea-input" placeholder="完整书评" />
          <input v-model="reviewForm.recommendReason" class="text-input" placeholder="推荐理由" />
          <input v-model="reviewForm.warningPoint" class="text-input" placeholder="避雷点" />
          <input v-model="reviewForm.targetReaders" class="text-input" placeholder="适合读者" />
          <select v-model="reviewForm.recommended" class="select-input">
            <option value="">是否推荐</option>
            <option value="true">推荐</option>
            <option value="false">不推荐</option>
          </select>
          <button class="button secondary" type="button" :disabled="savingReview" @click="saveReview">
            {{ savingReview ? "保存中" : "保存书评" }}
          </button>
        </div>
      </section>

      <section class="panel">
        <h2>弃读原因</h2>
        <div class="form-grid">
          <input v-model="dropReasonForm.reason" class="text-input" placeholder="弃读原因" />
          <textarea v-model="dropReasonForm.note" class="text-input textarea-input" placeholder="补充说明" />
          <label class="check-row">
            <input v-model="dropReasonForm.mayReadLater" type="checkbox" />
            以后可能再读
          </label>
          <button
            class="button secondary"
            type="button"
            :disabled="savingDropReason || !dropReasonForm.reason.trim()"
            @click="saveDropReasonForm"
          >
            {{ savingDropReason ? "保存中" : "保存弃读原因" }}
          </button>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { BookStatus } from "shared";
import RatingGrid from "../components/rating/RatingGrid.vue";
import { getBookReview, getDropReason, saveBookReview, saveDropReason, updateBookStatus } from "../services/books.api";
import { useBooksStore } from "../stores/books.store";
import { bookStatusLabels } from "../utils/format";

const route = useRoute();
const booksStore = useBooksStore();
const bookId = computed(() => String(route.params.bookId));
const book = computed(() => booksStore.byId(bookId.value));
const loading = ref(false);
const error = ref<string>();
const savingStatus = ref(false);
const savingReview = ref(false);
const savingDropReason = ref(false);
const statusDraft = ref<BookStatus>("not_started");
const reviewForm = reactive({
  shortComment: "",
  fullReview: "",
  recommendReason: "",
  warningPoint: "",
  recommended: "" as "" | "true" | "false",
  targetReaders: ""
});
const dropReasonForm = reactive({
  reason: "",
  note: "",
  mayReadLater: false
});

watch(
  bookId,
  () => {
    void loadDetail();
  },
  { immediate: true }
);

watch(
  book,
  (value) => {
    if (value) {
      statusDraft.value = value.status;
    }
  },
  { immediate: true }
);

async function loadDetail() {
  loading.value = true;
  error.value = undefined;

  try {
    await booksStore.fetchBook(bookId.value);
    const [review, dropReason] = await Promise.all([getBookReview(bookId.value), getDropReason(bookId.value)]);
    reviewForm.shortComment = review?.shortComment ?? "";
    reviewForm.fullReview = review?.fullReview ?? "";
    reviewForm.recommendReason = review?.recommendReason ?? "";
    reviewForm.warningPoint = review?.warningPoint ?? "";
    reviewForm.recommended = review?.recommended === undefined ? "" : review.recommended ? "true" : "false";
    reviewForm.targetReaders = review?.targetReaders ?? "";
    dropReasonForm.reason = dropReason?.reason ?? "";
    dropReasonForm.note = dropReason?.note ?? "";
    dropReasonForm.mayReadLater = dropReason?.mayReadLater ?? false;
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : "书籍详情加载失败";
  } finally {
    loading.value = false;
  }
}

async function refreshBook() {
  await booksStore.fetchBook(bookId.value);
}

async function saveStatus() {
  savingStatus.value = true;

  try {
    await updateBookStatus(bookId.value, statusDraft.value);
    await refreshBook();
  } finally {
    savingStatus.value = false;
  }
}

async function saveReview() {
  savingReview.value = true;

  try {
    await saveBookReview(bookId.value, {
      shortComment: reviewForm.shortComment,
      fullReview: reviewForm.fullReview,
      recommendReason: reviewForm.recommendReason,
      warningPoint: reviewForm.warningPoint,
      recommended: reviewForm.recommended === "" ? undefined : reviewForm.recommended === "true",
      targetReaders: reviewForm.targetReaders
    });
  } finally {
    savingReview.value = false;
  }
}

async function saveDropReasonForm() {
  savingDropReason.value = true;

  try {
    await saveDropReason(bookId.value, {
      reason: dropReasonForm.reason,
      note: dropReasonForm.note,
      mayReadLater: dropReasonForm.mayReadLater
    });
  } finally {
    savingDropReason.value = false;
  }
}
</script>
