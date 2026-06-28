"use client";

import type { DeliveryPreference, PublicUser } from "@/store/auth.store";

export const MOCK_OTP = "123456";
export const AUTH_ACCOUNTS_KEY = "buizz-auth-accounts";
export const CURRENT_USER_KEY = "buizz-user";

export type AuthProvider = "email" | "phone" | "google";
export type MockAccount = NonNullable<PublicUser>;

type AccountRegistry = Record<string, MockAccount>;

function canUseStorage() {
  return typeof window !== "undefined";
}

function cleanEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

function cleanPhone(phone?: string) {
  return phone?.trim() || undefined;
}

export function resolveDeliveryPreference(preference: DeliveryPreference | undefined, hasEmail: boolean, hasPhone: boolean): DeliveryPreference {
  if (hasEmail && hasPhone) return preference ?? "both";
  if (hasPhone) return "whatsapp";
  return "email";
}

export function normalizeAccount(account: Partial<MockAccount> & { id?: string; name?: string }): MockAccount {
  const email = cleanEmail(account.email);
  const phone = cleanPhone(account.phone);
  const isEmailVerified = Boolean(email && account.isEmailVerified);
  const isPhoneVerified = Boolean(phone && account.isPhoneVerified);
  const authProvider: AuthProvider = account.authProvider ?? (phone && !email ? "phone" : "email");
  const id = account.id || email || phone || `buizz-${Date.now()}`;

  return {
    id,
    name: account.name?.trim() || "Buizz User",
    email,
    phone,
    password: account.password ?? "",
    authProvider,
    isEmailVerified,
    isPhoneVerified,
    preferredDelivery: resolveDeliveryPreference(account.preferredDelivery, isEmailVerified, isPhoneVerified),
  };
}

export function readAccounts(): AccountRegistry {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(AUTH_ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as AccountRegistry;
    return Object.fromEntries(Object.entries(parsed).map(([key, account]) => [key, normalizeAccount(account)]));
  } catch {
    window.localStorage.removeItem(AUTH_ACCOUNTS_KEY);
    return {};
  }
}

export function writeAccounts(accounts: AccountRegistry) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function saveAccount(account: MockAccount) {
  const normalized = normalizeAccount(account);
  const accounts = readAccounts();
  accounts[normalized.id] = normalized;
  writeAccounts(accounts);
  return normalized;
}

export function findAccount(identifier: string): MockAccount | null {
  const value = identifier.trim().toLowerCase();
  if (!value) return null;
  const accounts = readAccounts();
  return (
    Object.values(accounts).find((account) => account.id.toLowerCase() === value || account.email?.toLowerCase() === value || account.phone === identifier.trim()) ?? null
  );
}

export function accountExists(identifier: string) {
  return Boolean(findAccount(identifier));
}

export function setCurrentMockUser(user: PublicUser) {
  if (!canUseStorage()) return;
  if (!user) {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return;
  }
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalizeAccount(user)));
}

export function createEmailAccount({ name, email, password }: { name: string; email: string; password: string }) {
  const id = cleanEmail(email) ?? email.trim();
  return saveAccount(
    normalizeAccount({
      id,
      name,
      email,
      password,
      authProvider: "email",
      isEmailVerified: true,
      isPhoneVerified: false,
      preferredDelivery: "email",
    })
  );
}

export function createPhoneAccount({ name, phone, password }: { name: string; phone: string; password: string }) {
  const id = cleanPhone(phone) ?? phone.trim();
  return saveAccount(
    normalizeAccount({
      id,
      name,
      phone,
      password,
      authProvider: "phone",
      isEmailVerified: false,
      isPhoneVerified: true,
      preferredDelivery: "whatsapp",
    })
  );
}

export function createGoogleAccount() {
  return saveAccount(
    normalizeAccount({
      id: "google.user@buizz.local",
      name: "Google User",
      email: "google.user@buizz.local",
      password: "",
      authProvider: "google",
      isEmailVerified: true,
      isPhoneVerified: false,
      preferredDelivery: "email",
    })
  );
}

export function updateAccountPassword(identifier: string, password: string) {
  const account = findAccount(identifier);
  if (!account) return null;
  return saveAccount({ ...account, password });
}

export function updateAccountContact(account: MockAccount, patch: Partial<MockAccount>) {
  const next = normalizeAccount({ ...account, ...patch });
  return saveAccount(next);
}
