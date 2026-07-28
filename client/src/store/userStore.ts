import { create } from "zustand";
import type { UserProfile } from "@/types";

type UserState = {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
};

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
