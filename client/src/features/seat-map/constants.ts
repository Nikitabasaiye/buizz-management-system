// export { bookingTechniqueLabels, defaultBuilderDraft, defaultSeatMapPermissions } from "@/features/seat-map/sampleLayouts";

// export const SEAT_MAP_TEMPLATE_STORAGE_KEY = "buizz-seat-map-templates";
// export const EVENT_SEAT_CONFIG_STORAGE_KEY = "buizz-event-seat-configs";
// export const SEAT_HOLD_STORAGE_KEY = "buizz-seat-holds";
// export const SEAT_MAP_AUDIT_STORAGE_KEY = "buizz-seat-map-audit";
// Final Buizz seat-map storage keys.
// Keep all seat-map pages on these keys so Admin/Super Admin, Organizer, and Public booking read the same data.
// Final Buizz seat-map storage keys.
// Keep all seat-map pages on these keys so Admin/Super Admin, Organizer, and Public booking read the same data.

export const SEAT_MAP_TEMPLATE_STORAGE_KEY = "buizz-seat-map-templates-v4-real-editor";
export const SELECTED_SEAT_MAP_TEMPLATE_STORAGE_KEY = "buizz-seat-map-selected-template-v4";
export const ORGANIZER_SEAT_OVERRIDE_STORAGE_KEY = "buizz-seat-map-organizer-overrides-v4";
export const ORGANIZER_SEAT_PLAN_STORAGE_KEY = "buizz-organizer-event-seat-plan-v1";
export const EVENT_SEAT_CONFIG_STORAGE_KEY = "buizz-event-seat-configs-v1-final";
export const SEAT_HOLD_STORAGE_KEY = "buizz-seat-holds-v1-final";
export const SEAT_MAP_AUDIT_STORAGE_KEY = "buizz-seat-map-audit-v1-final";
export const ORGANIZER_BLUEPRINT_REQUEST_STORAGE_KEY = "buizz-organizer-blueprint-requests-v1-final";

// Legacy aliases. Do not create new storage systems; point old imports to the final keys.
export const BUIZZ_SEAT_MAP_TEMPLATES_KEY = SEAT_MAP_TEMPLATE_STORAGE_KEY;
export const BUIZZ_ORGANIZER_SEAT_OVERRIDES_KEY = ORGANIZER_SEAT_OVERRIDE_STORAGE_KEY;
export const BUIZZ_PUBLIC_SEAT_LOCKS_KEY = SEAT_HOLD_STORAGE_KEY;
export const BUIZZ_PUBLIC_SEAT_AVAILABILITY_KEY = EVENT_SEAT_CONFIG_STORAGE_KEY;
export const BUIZZ_SEAT_MAP_AUDIT_KEY = SEAT_MAP_AUDIT_STORAGE_KEY;
export const BUIZZ_ORGANIZER_BLUEPRINT_REQUESTS_KEY = ORGANIZER_BLUEPRINT_REQUEST_STORAGE_KEY;
export const BUIZZ_ORGANIZER_CREATE_EVENT_SEAT_MAP_DRAFT_KEY = ORGANIZER_SEAT_PLAN_STORAGE_KEY;

// Backend replacement points:
// GET    /api/admin/seat-map-templates
// POST   /api/admin/seat-map-templates
// PATCH  /api/admin/seat-map-templates/:id
// POST   /api/admin/seat-map-templates/:id/publish
// GET    /api/organizer/events/:eventId/seat-map
// POST   /api/organizer/events/:eventId/seat-map-copy
// PATCH  /api/organizer/events/:eventId/seat-map-copy/:copyId
// GET    /api/events/:eventId/seat-map
// POST   /api/booking/seat-holds
// DELETE /api/booking/seat-holds/:holdId
