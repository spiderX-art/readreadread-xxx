import { computed } from "vue";
import { useReaderStore } from "../stores/reader.store";

export function useReader() {
  const reader = useReaderStore();

  return {
    progressLabel: computed(() => `${Math.round(reader.progressPercent)}%`),
    reader
  };
}
