import { create } from "zustand";
import { persist } from "zustand/middleware";

type WishlistState = {
  savedIds: string[];
  toggleSaved: (id: string) => void;
  removeSaved: (id: string) => void;
  clearSaved: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set) => ({
      savedIds: [],
      toggleSaved: (id) =>
        set((state) => ({
          savedIds: state.savedIds.includes(id)
            ? state.savedIds.filter((savedId) => savedId !== id)
            : [...state.savedIds, id],
        })),
      removeSaved: (id) => set((state) => ({ savedIds: state.savedIds.filter((savedId) => savedId !== id) })),
      clearSaved: () => set({ savedIds: [] }),
    }),
    {
      name: "buizz-wishlist",
    }
  )
);
