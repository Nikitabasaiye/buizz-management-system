export const publicRoutes = ["/", "/events", "/login", "/signup", "/reset-password", "/forgot-password", "/about", "/contact"] as const;

export const customerRoutes = ["/profile", "/profile/tickets", "/profile/passport", "/profile/wishlist", "/profile/settings"] as const;

export const organizerRoutes = ["/organizer", "/organizer/login", "/organizer/signup", "/organizer/onboarding", "/organizer/dashboard", "/organizer/events", "/organizer/create-event", "/organizer/attendees", "/organizer/analytics"] as const;

export const adminRoutes = ["/admin/dashboard", "/admin/users", "/admin/events", "/admin/bookings", "/admin/payments"] as const;
