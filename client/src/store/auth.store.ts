import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserRole } from "@/types/auth";

export type DeliveryPreference = "email" | "whatsapp" | "both";
export type AuthProvider = "email" | "phone" | "google" | "facebook";

export type PublicUser = {
  id: string;
  displayId?: string;
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role?: UserRole;
  authProvider: AuthProvider;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  preferredDelivery: DeliveryPreference;
} | null;

type AuthState = {
  user: PublicUser;
  status: "guest" | "authenticated";
  setUser: (user: PublicUser) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      status: "guest",
      setUser: (user) => set({ user: normalizeUser(user), status: user ? "authenticated" : "guest" }),
      logout: () => set({ user: null, status: "guest" }),
    }),
    {
      name: "buizz-auth",
      version: 4,
      migrate: (state) => {
        const persisted = state as { user?: PublicUser; status?: "guest" | "authenticated" } | undefined;
        const user = persisted?.user ? { ...persisted.user, id: String((persisted.user as any).id ?? "") } : null;
        return {
          user: normalizeUser(user),
          status: user ? "authenticated" : "guest",
        };
      },
    }
  )
);

export function normalizeUser(user: PublicUser): PublicUser {
  if (!user) return null;
  const email = user.email?.trim().toLowerCase() || undefined;
  const phone = user.phone?.trim() || undefined;
  const legacyUser = user as PublicUser & { authProvider?: AuthProvider; password?: string };
  const isEmailVerified = Boolean(email && ("isEmailVerified" in user ? user.isEmailVerified : false));
  const isPhoneVerified = Boolean(phone && ("isPhoneVerified" in user ? user.isPhoneVerified : false));
  const preferredDelivery = resolvePreferredDelivery(user.preferredDelivery, isEmailVerified, isPhoneVerified);

  return {
    ...user,
    id: user.id || email || phone || `buizz-${Date.now()}`,
    email,
    phone,
    password: legacyUser.password ?? "",
    authProvider: legacyUser.authProvider ?? (phone && !email ? "phone" : "email"),
    isEmailVerified,
    isPhoneVerified,
    preferredDelivery,
  };
}

function resolvePreferredDelivery(preference: DeliveryPreference | undefined, hasEmail: boolean, hasPhone: boolean): DeliveryPreference {
  if (hasEmail && hasPhone) return preference ?? "both";
  if (hasPhone) return "whatsapp";
  return "email";
}
