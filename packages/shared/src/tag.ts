export const TAG_TYPES = ["genre", "experience", "warning", "custom"] as const;

export type TagType = (typeof TAG_TYPES)[number];

export interface Tag {
  id: string;
  userId: string;
  name: string;
  type: TagType;
  createdAt: string;
  updatedAt: string;
}
