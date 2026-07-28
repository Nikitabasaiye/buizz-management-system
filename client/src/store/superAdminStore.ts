import { create } from "zustand";
import { persist } from "zustand/middleware";

type SuperAdminSession = {
  name: string;
  email: string;
} | null;

type SuperAdminState = {
  session: SuperAdminSession;
  login: (email: string) => void;
  logout: () => void;
};

export const useSuperAdminStore = create<SuperAdminState>()(
  persist(
    (set) => ({
      session: null,
      login: (email) => set({ session: { name: "Super Admin", email: email.trim() } }),
      logout: () => set({ session: null }),
    }),
    {
      name: "buizz-super-admin",
      version: 1,
    }
  )

);

