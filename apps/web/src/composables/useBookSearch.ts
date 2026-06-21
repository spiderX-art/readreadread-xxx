import { ref } from "vue";

export function useBookSearch() {
  const keyword = ref("");

  return {
    keyword
  };
}
