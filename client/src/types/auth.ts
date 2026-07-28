export type UserRole =
  | "customer"
  | "organizer"
  | "admin"
  | "super_admin"
  | "checkin_staff"
  | "influencer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
