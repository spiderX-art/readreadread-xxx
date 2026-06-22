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
    <section v-else-if="error" class="panel state-panel">
      <h2>详情加载失败</h2>
      <p class="error-text">{{ error }}</p>
      <button class="button secondary" type="button" @click="loadDetail">重试</button>
    </section>

    <div v-else-if="book" class="grid">
      <p v-if="actionMessage" class="notice success-text">{{ actionMessage }}</p>
      <p v-if="actionError" class="notice error-text">{{ actionError }}</p>

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
        <h2>标签</h2>
        <div v-if="book.tags?.length" class="tag-list editable-tag-list">
          <button v-for="tag in book.tags" :key="tag.id" class="tag tag-button" type="button" @click="removeTag(tag.id)">
            {{ tag.name }} ×
          </button>
        </div>
        <p v-else class="book-meta">还没有标签。</p>
        <div class="form-grid tag-editor">
          <div class="form-row">
            <select v-model="selectedTagId" class="select-input">
              <option value="">选择已有标签</option>
              <option v-for="tag in availableTags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
            <button class="button secondary" type="button" :disabled="savingTag || !selectedTagId" @click="addSelectedTag">
              {{ savingTag ? "保存中" : "添加标签" }}
            </button>
          </div>
          <div class="form-row">
            <input v-model="newTagName" class="text-input" maxlength="24" placeholder="新标签名称" />
            <select v-model="newTagType" class="select-input">
              <option v-for="type in TAG_TYPES" :key="type" :value="type">{{ tagTypeLabels[type] }}</option>
            </select>
            <button class="button secondary" type="button" :disabled="savingTag || !newTagName.trim()" @click="createAndAttachTag">
              新建并添加
            </button>
          </div>
        </div>
      </section>

      <section class="panel">
        <h2>评分</h2>
        <RatingGrid :book-id="bookId" @saved="handleRatingSaved" />
      </section>

      <section class="panel">
        <h2>书评</h2>
        <div class="form-grid">
          <input v-model="reviewForm.shortComment" class="text-input" placeholder="短评" />
          <button class="button secondary" type="button" :disabled="savingReview" @click="saveReview">
            {{ savingReview ? "保存中" : "保存书评" }}
          </button>
        </div>
      </section>

      <section class="panel danger-zone">
        <h2>删除书籍</h2>
        <p class="book-meta">删除后会移除书籍、阅读进度、评分和书评记录。</p>
        <div v-if="confirmingDelete" class="form-row">
          <button class="button warning" type="button" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? "删除中" : "确认删除" }}
          </button>
          <button class="button secondary" type="button" :disabled="deleting" @click="confirmingDelete = false">取消</button>
        </div>
        <button v-else class="button warning" type="button" @click="confirmingDelete = true">删除书籍</button>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { TAG_TYPES, type BookStatus, type Tag, type TagType } from "shared";
import RatingGrid from "../components/rating/RatingGrid.vue";
import { getBookReview, saveBookReview, updateBookStatus } from "../services/books.api";
import { attachTagToBook, createTag, detachTagFromBook, listTags } from "../services/tags.api";
import { useBooksStore } from "../stores/books.store";
import { bookStatusLabels } from "../utils/format";

const route = useRoute();
const router = useRouter();
const booksStore = useBooksStore();
const bookId = computed(() => String(route.params.bookId));
const book = computed(() => booksStore.byId(bookId.value));
const loading = ref(false);
const error = ref<string>();
const savingStatus = ref(false);
const savingReview = ref(false);
const savingTag = ref(false);
const deleting = ref(false);
const confirmingDelete = ref(false);
const actionMessage = ref<string>();
const actionError = ref<string>();
const statusDraft = ref<BookStatus>("not_started");
const tags = ref<Tag[]>([]);
const selectedTagId = ref("");
const newTagName = ref("");
const newTagType = ref<TagType>("custom");
const reviewForm = reactive({
  shortComment: ""
});
const tagTypeLabels: Record<TagType, string> = {
  genre: "题材",
  experience: "体验",
  warning: "避雷",
  custom: "自定义"
};
const attachedTagIds = computed(() => new Set(book.value?.tags?.map((tag) => tag.id) ?? []));
const availableTags = computed(() => tags.value.filter((tag) => !attachedTagIds.value.has(tag.id)));

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
  clearActionFeedback();
  confirmingDelete.value = false;

  try {
    await booksStore.fetchBook(bookId.value);
    const [review, tagResult] = await Promise.all([getBookReview(bookId.value), listTags()]);
    reviewForm.shortComment = review?.shortComment ?? "";
    tags.value = tagResult.items;
    selectedTagId.value = "";
    newTagName.value = "";
  } catch (loadError) {
    error.value = loadError instanceof Error ? loadError.message : "书籍详情加载失败";
  } finally {
    loading.value = false;
  }
}

async function refreshBook() {
  await booksStore.fetchBook(bookId.value);
}

async function handleRatingSaved() {
  clearActionFeedback();

  try {
    await refreshBook();
    showSuccess("评分已保存");
  } catch (saveError) {
    showError(saveError, "评分已保存，但书籍摘要刷新失败");
  }
}

async function saveStatus() {
  savingStatus.value = true;
  clearActionFeedback();

  try {
    await updateBookStatus(bookId.value, statusDraft.value);
    await refreshBook();
    showSuccess("阅读状态已保存");
  } catch (saveError) {
    showError(saveError, "阅读状态保存失败");
  } finally {
    savingStatus.value = false;
  }
}

async function saveReview() {
  savingReview.value = true;
  clearActionFeedback();

  try {
    await saveBookReview(bookId.value, {
      shortComment: reviewForm.shortComment
    });
    showSuccess("书评已保存");
  } catch (saveError) {
    showError(saveError, "书评保存失败");
  } finally {
    savingReview.value = false;
  }
}

async function addSelectedTag() {
  if (!selectedTagId.value) {
    return;
  }

  savingTag.value = true;
  clearActionFeedback();

  try {
    await attachTagToBook(bookId.value, selectedTagId.value);
    selectedTagId.value = "";
    await refreshBook();
    showSuccess("标签已添加");
  } catch (saveError) {
    showError(saveError, "标签添加失败");
  } finally {
    savingTag.value = false;
  }
}

async function createAndAttachTag() {
  const name = newTagName.value.trim();

  if (!name) {
    return;
  }

  savingTag.value = true;
  clearActionFeedback();

  try {
    const tag = await createTag({ name, type: newTagType.value });
    tags.value = [...tags.value, tag];
    await attachTagToBook(bookId.value, tag.id);
    newTagName.value = "";
    selectedTagId.value = "";
    await refreshBook();
    showSuccess("标签已添加");
  } catch (saveError) {
    showError(saveError, "标签添加失败");
  } finally {
    savingTag.value = false;
  }
}

async function removeTag(tagId: string) {
  savingTag.value = true;
  clearActionFeedback();

  try {
    await detachTagFromBook(bookId.value, tagId);
    await refreshBook();
    showSuccess("标签已移除");
  } catch (saveError) {
    showError(saveError, "标签移除失败");
  } finally {
    savingTag.value = false;
  }
}

async function confirmDelete() {
  deleting.value = true;
  clearActionFeedback();

  try {
    await booksStore.deleteBook(bookId.value);
    await router.push({ name: "bookshelf" });
  } catch (deleteError) {
    showError(deleteError, "删除书籍失败");
  } finally {
    deleting.value = false;
  }
}

function clearActionFeedback(): void {
  actionMessage.value = undefined;
  actionError.value = undefined;
}

function showSuccess(message: string): void {
  actionMessage.value = message;
  actionError.value = undefined;
}

function showError(error: unknown, fallback: string): void {
  actionMessage.value = undefined;
  actionError.value = error instanceof Error ? error.message : fallback;
}
</script>
