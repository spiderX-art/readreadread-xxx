import type { PageResult, Tag, TagType } from "shared";
import { apiDelete, apiGet, apiPost } from "./api";

export function listTags(): Promise<PageResult<Tag>> {
  return apiGet<PageResult<Tag>>("/api/tags");
}

export function createTag(body: { name: string; type?: TagType }): Promise<Tag> {
  return apiPost<Tag>("/api/tags", body);
}

export function attachTagToBook(bookId: string, tagId: string): Promise<{ bookId: string; tagId: string; attached: boolean }> {
  return apiPost<{ bookId: string; tagId: string; attached: boolean }>(`/api/books/${encodeURIComponent(bookId)}/tags`, {
    tagId
  });
}

export function detachTagFromBook(bookId: string, tagId: string): Promise<{ bookId: string; tagId: string; detached: boolean }> {
  return apiDelete<{ bookId: string; tagId: string; detached: boolean }>(
    `/api/books/${encodeURIComponent(bookId)}/tags/${encodeURIComponent(tagId)}`
  );
}
