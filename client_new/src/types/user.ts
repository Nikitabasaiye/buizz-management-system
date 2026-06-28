import type { UserRole } from "./auth";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
