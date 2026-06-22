<template>
  <section>
    <p v-if="loading" class="muted">正在加载书籍详情...</p>
    <section v-else-if="error" class="panel state-panel">
      <h2>详情加载失败</h2>
      <p class="error-text">{{ error }}</p>
      <button class="button secondary" type="button" @click="loadDetail">重试</button>
    </section>

    <div v-else-if="book" class="book-detail-page">
      <p v-if="actionMessage" class="notice success-text">{{ actionMessage }}</p>
      <p v-if="actionError" class="notice error-text">{{ actionError }}</p>

      <section class="book-hero panel">
        <div class="book-cover" aria-hidden="true">
          <strong>{{ book.title }}</strong>
          <span>{{ book.author || "未知作者" }}</span>
        </div>
        <div class="book-hero-main">
          <h1>{{ book.title }}</h1>
          <p class="book-author-line">作者：{{ book.author || "未知作者" }}</p>
          <dl class="book-hero-meta">
            <div>
              <dt>类型</dt>
              <dd>小说</dd>
            </div>
            <div>
              <dt>格式</dt>
              <dd>TXT</dd>
            </div>
            <div>
              <dt>字数</dt>
              <dd>{{ book.wordCount.toLocaleString() }} 字</dd>
            </div>
            <div>
              <dt>章节</dt>
              <dd>{{ book.chapterCount }} 章</dd>
            </div>
            <div>
              <dt>导入时间</dt>
              <dd>{{ formatDateTime(book.createdAt) }}</dd>
            </div>
          </dl>
        </div>
        <div class="book-hero-actions">
          <RouterLink class="button" :to="`/books/${bookId}/read`">继续阅读</RouterLink>
          <RouterLink class="button secondary" :to="`/books/${bookId}/search`">书内搜索</RouterLink>
        </div>
      </section>

      <div class="detail-card-grid">
        <section class="panel detail-card reading-card">
          <h2>阅读状态</h2>
          <p class="detail-card-value">{{ bookStatusLabels[book.status] }}</p>
          <p class="muted">开始你的阅读之旅吧</p>
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

        <section class="panel detail-card">
          <h2>书籍信息</h2>
          <dl class="info-list">
            <div>
              <dt>文件名</dt>
              <dd>{{ book.fileName }}</dd>
            </div>
            <div>
              <dt>文件大小</dt>
              <dd>{{ formatFileSize(book.fileSize) }}</dd>
            </div>
            <div>
              <dt>文件路径</dt>
              <dd>{{ book.sourcePath || "本地导入" }}</dd>
            </div>
            <div>
              <dt>导入时间</dt>
              <dd>{{ formatDateTime(book.createdAt) }}</dd>
            </div>
          </dl>
        </section>

        <section class="panel detail-card">
          <h2>标签</h2>
          <div v-if="book.tags?.length" class="tag-list editable-tag-list">
            <button v-for="tag in book.tags" :key="tag.id" class="tag tag-button" type="button" @click="removeTag(tag.id)">
              {{ tag.name }} ×
            </button>
          </div>
          <p v-else class="book-meta">还没有标签</p>
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

        <section class="panel detail-card">
          <h2>评分</h2>
          <RatingGrid :book-id="bookId" @saved="handleRatingSaved" />
        </section>

        <section class="panel detail-card">
          <h2>书评</h2>
          <div class="form-grid">
            <textarea v-model="reviewForm.shortComment" class="text-input textarea-input" maxlength="500" placeholder="写下你的书评..." />
            <button class="button secondary" type="button" :disabled="savingReview" @click="saveReview">
              {{ savingReview ? "保存中" : "保存书评" }}
            </button>
          </div>
        </section>

        <section class="panel detail-card danger-zone">
          <h2>删除书籍</h2>
          <p class="book-meta">删除后将移除书籍、阅读进度、评分和书评记录，且无法恢复。</p>
          <div v-if="confirmingDelete" class="form-row">
            <button class="button warning" type="button" :disabled="deleting" @click="confirmDelete">
              {{ deleting ? "删除中" : "确认删除" }}
            </button>
            <button class="button secondary" type="button" :disabled="deleting" @click="confirmingDelete = false">取消</button>
          </div>
          <button v-else class="button warning" type="button" @click="confirmingDelete = true">删除书籍</button>
        </section>
      </div>
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
import { bookStatusLabels, formatDateTime, formatFileSize } from "../utils/format";

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
