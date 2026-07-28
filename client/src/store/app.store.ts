import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

type AppState = {
  theme: ThemeMode;
  mobileNavOpen: boolean;
  selectedCity: string;
  setTheme: (theme: ThemeMode) => void;
  setMobileNavOpen: (open: boolean) => void;
  setSelectedCity: (city: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: "system",
      mobileNavOpen: false,
      selectedCity: "Pune",
      setTheme: (theme) => set({ theme }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setSelectedCity: (selectedCity) => set({ selectedCity }),
    }),
    {
      name: "buizz-app-preferences",
      partialize: (state) => ({ selectedCity: state.selectedCity, theme: state.theme }),
    }
  )
);
