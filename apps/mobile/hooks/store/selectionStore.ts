import { create } from "zustand";

type SelectionState = {
  selectionMode: boolean;
  selectedIds: string[];
  toggleSelection: (id: string) => void;
  setSelectionMode: (mode: boolean) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
};

export const useSelectionStore = create<SelectionState>((set) => ({
  selectionMode: false,
  selectedIds: [],
  toggleSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      const newSelectedIds = isSelected
        ? state.selectedIds.filter((itemId) => itemId !== id)
        : [...state.selectedIds, id];

      // Auto-exit selection mode if no items selected
      const newSelectionMode = newSelectedIds.length > 0 ? true : false;

      // Optionally, if we toggle off the last item, should we exit mode?
      // The original code did: if (newSelection.length === 0) setSelectionMode(false);
      // Let's keep that behavior, but maybe check if we actally want that globally?
      // Usually yes.

      return {
        selectedIds: newSelectedIds,
        selectionMode: newSelectedIds.length > 0,
      };
    }),
  setSelectionMode: (mode) =>
    set((state) => ({
      selectionMode: mode,
      selectedIds: mode ? state.selectedIds : [], // Clear if turning off?
    })),
  clearSelection: () => set({ selectedIds: [], selectionMode: false }),
  selectAll: (ids) =>
    set((state) => {
      // Toggle behavior: if all selected, deselect all. Else select all.
      const allSelected = ids.every((id) => state.selectedIds.includes(id));
      if (allSelected) {
        return { selectedIds: [], selectionMode: false };
      }
      return { selectedIds: ids, selectionMode: true };
    }),
}));
