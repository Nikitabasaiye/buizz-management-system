// ── API Slice (base) ──────────────────────────────────────────────────────────
export { apiSlice, getStoredSession, storeSession, clearSession } from '../apiSlice';

// ── Unified Auth API ──────────────────────────────────────────────────────────
export {
  authApi,
  userAuthApi, organizerAuthApi, adminAuthApi, influencerAuthApi,
  // Core hooks
  useRegisterMutation,
  useLoginMutation,
  useLogoutUserMutation,
  useRefreshTokenMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGoogleLoginMutation,
  useFacebookLoginMutation,
  useSocialLoginMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useSendPasswordResetOtpMutation,
  useVerifyPasswordResetOtpMutation,
  useCompletePasswordResetMutation,
  useSendPhoneOtpMutation,
  useVerifyPhoneOtpMutation,
  // User aliases
  useUserRegisterMutation,
  useUserLoginMutation,
  useUserLogoutMutation,
  useUserForgotPasswordMutation,
  useUserResetPasswordMutation,
  useUserVerifyEmailMutation,
  useUserGoogleLoginMutation,
  useUserFacebookLoginMutation,
  useUserRefreshTokenMutation,
  // Organizer aliases
  useOrganizerRegisterMutation,
  useOrganizerLoginMutation,
  useOrganizerLogoutMutation,
  useOrganizerForgotPasswordMutation,
  useOrganizerResetPasswordMutation,
  useOrganizerVerifyEmailMutation,
  useOrganizerRefreshTokenAliasMutation,
  // Influencer auth stubs
  useInfluencerRegisterMutation,
  useInfluencerLoginMutation,
  useInfluencerLogoutMutation,
  useInfluencerForgotPasswordMutation,
  useInfluencerResetPasswordMutation,
  useInfluencerVerifyEmailMutation,
  // Influencer profile stubs
  useGetInfluencerProfileQuery,
  useUpdateInfluencerProfileMutation,
  useUpdateInfluencerBankDetailsMutation,
  useInfluencerChangePasswordMutation,
} from './authApi';

// ── Organizer API ─────────────────────────────────────────────────────────────
export {
  organizerApi,
  useGetOrganizerProfileQuery,
  useUpdateOrganizerProfileMutation,
  useUpdateOrganizerBankDetailsMutation,
  useOrganizerChangePasswordMutation,
  useGetOrganizerAnalyticsQuery,
  useGetOrganizerEventsQuery,
  useGetOrganizerBookingsQuery,
  useGetOrganizerRevenueSummaryQuery,
  useGetOrganizerAttendeesQuery,
  useGetOrganizerByIdQuery,
  useVerifyOrganizerKycMutation,
  useDeactivateOrganizerMutation,
} from './organizerApi';

// ── Admin API ─────────────────────────────────────────────────────────────────
export {
  adminApi,
  useAdminLoginMutation,
  useAdminGoogleLoginMutation,
  useAdminRegisterMutation,
  useAdminLogoutMutation,
  useGetAdminProfileQuery,
  useGetAdminUsersQuery,
  useGetAdminUserByIdQuery,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
  useGetAdminDashboardStatsQuery,
  useGetAdminRevenueAnalyticsQuery,
  useGetPermissionsQuery,
  useGetGroupsQuery,
  useUpdateAdminProfileMutation,
  useGetAllAdminsQuery,
  useDeactivateAdminMutation,
} from './adminApi';

// ── Events ────────────────────────────────────────────────────────────────────
export {
  eventsApi,
  useGetEventsQuery,
  useGetDraftEventsQuery,
  useGetEventByIdQuery,
  useGetEventBySlugQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
  usePublishEventMutation,
  useSubmitEventForReviewMutation,
  useUploadEventImageMutation,
} from './eventsApi';

export {
  eventGalleryApi,
  useGetEventGalleryImagesQuery,
} from './eventGalleryApi';

// ── Bookings ──────────────────────────────────────────────────────────────────
export {
  bookingsApi,
  useInitiateBookingMutation,
  useVerifyPaymentQuery,
  useGetBookingDetailsQuery,
  useGetUserBookingsQuery,
  useGetAllBookingsQuery,
} from './bookingsApi';

// ── Tickets ───────────────────────────────────────────────────────────────────
export {
  ticketsApi,
  useGetMyTicketsQuery,
  useGetTicketByNumberQuery,
  useScanTicketMutation,
  useCancelTicketMutation,
  useGetEventTicketsQuery,
} from './ticketsApi';

// ── Users ─────────────────────────────────────────────────────────────────────
export {
  usersApi,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
} from './usersApi';

// ── Analytics ─────────────────────────────────────────────────────────────────
export {
  analyticsApi,
  useGetVisitorSummaryQuery,
  useTrackVisitorMutation,
  useGetDashboardQuery,
  useGetEventAnalyticsQuery,
} from './analyticsApi';

// ── Check-in ──────────────────────────────────────────────────────────────────
export {
  checkinApi,
  useValidateTicketMutation,
  useCheckInTicketMutation,
  useCheckInBatchMutation,
  useGetEventCheckinsQuery,
  useGetCheckinStatsQuery,
  useGetTicketCheckinQuery,
  useGetEventAttendeesListQuery,
} from './checkinApi';
export type { ValidateTicketResponse, ScanStatus } from './checkinApi';

// ── Notifications ─────────────────────────────────────────────────────────────
export {
  notificationApi,
  useGetNotificationsQuery,
  useGetNotificationByIdQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useGetUnreadCountQuery,
} from './notificationsApi';

// ── Search ────────────────────────────────────────────────────────────────────
export {
  searchApi,
  useSearchEventsQuery,
  useSearchOrganizersQuery,
  useSearchUsersQuery,
  useAdvancedEventSearchMutation,
  useAutocompleteQuery,
} from './searchApi';

// ── Seat Maps ─────────────────────────────────────────────────────────────────
export {
  seatmapsApi,
  useGetSeatMapTemplatesQuery,
  useGetSeatMapTemplateByIdQuery,
  useCreateSeatMapTemplateMutation,
  useUpdateSeatMapTemplateMutation,
  useDeleteSeatMapTemplateMutation,
  useGetSeatMapOverrideQuery,
  useCreateSeatMapOverrideMutation,
  useUpdateSeatMapOverrideMutation,
  useDeleteSeatMapOverrideMutation,
  useUpdateSeatStatusMutation,
  useGetAvailableSeatsQuery,
  useGetEventSeatMapQuery,
} from './seatmapsApi';

// ── Support ───────────────────────────────────────────────────────────────────
export {
  supportApi,
  useCreateSupportTicketMutation,
  useGetAllSupportTicketsQuery,
  useGetSupportTicketStatsQuery,
  useGetSupportTicketByIdQuery,
  useUpdateSupportTicketMutation,
  useDeleteSupportTicketMutation,
} from './supportApi';

// ── Settlements ───────────────────────────────────────────────────────────────
export {
  settlementApi,
  useGetMyBankAccountQuery,
  useGetOrganizerBankAccountQuery,
  useSaveMyBankAccountMutation,
  useAdminVerifyBankAccountMutation,
  useGetMySummaryQuery,
  useGetOrganizerSummaryQuery,
  useGetEligibleGroupsQuery,
  useGenerateSettlementMutation,
  useGenerateAllEligibleSettlementsMutation,
  useGetSettlementsQuery,
  useGetSettlementByIdQuery,
  useUpdateSettlementStatusMutation,
} from './settlementsApi';

// Legacy aliases for any existing imports
export { useSaveMyBankAccountMutation as useSaveBankAccountMutation } from './settlementsApi';
export { useAdminVerifyBankAccountMutation as useVerifyBankAccountMutation } from './settlementsApi';

// ── KYC ───────────────────────────────────────────────────────────────────────
export {
  kycApi,
  useGetKycStatusQuery,
  useUploadKycDocumentMutation,
  useSubmitKycMutation,
  useGetKycRequestsQuery,
  useGetKycRequestByIdQuery,
  useReviewKycRequestMutation,
} from './kycApi';
export type { KycDocumentPayload, KycSubmissionPayload, KycUploadResponse } from './kycApi';

// ── Platform API (admin/super-admin dashboard) ────────────────────────────────
// All conflicting names are aliased with "Platform" prefix to avoid duplicates.
export {
  platformApi,
  useGetDashboardMetricsQuery,
  useGetOrganizersQuery,
  useGetOrganizerByIdQuery         as useGetPlatformOrganizerByIdQuery,
  useGetOrganizerKycDetailsQuery,
  useUpdateOrganizerStatusMutation,
  useGetEventsQuery                as useGetPlatformEventsQuery,
  useGetEventByIdQuery             as useGetPlatformEventByIdQuery,
  useGetEventBySlugQuery           as useGetPlatformEventBySlugQuery,
  useUpdateEventStatusMutation,
  useGetOrganizerBookingsQuery     as useGetPlatformOrganizerBookingsQuery,
  useGetBookingByIdQuery,
  useCreateOfflineBookingMutation,
  useGetPlatformUsersQuery,
  useGetPlatformUserByIdQuery,
  useUpdateUserStatusMutation,
  useGetApprovalQueueQuery,
  useApproveItemMutation,
  useRejectItemMutation,
  useReviewEventApprovalMutation,
  useGetRevenueMetricsQuery,
  useGetRevenueChartQuery,
} from './platformApi';

// ── Reviews ───────────────────────────────────────────────────────────────────
export {
  reviewsApi,
  useGetEventReviewsQuery          as useGetReviewsEventReviewsQuery,
  useCreateReviewMutation          as useCreateReviewsReviewMutation,
  useGetUserReviewsQuery           as useGetReviewsUserReviewsQuery,
  useUpdateReviewMutation          as useUpdateReviewsReviewMutation,
  useDeleteReviewMutation          as useDeleteReviewsReviewMutation,
  useMarkReviewHelpfulMutation,
  useReportReviewMutation,
  useGetAllReviewsQuery,
  useUpdateReviewStatusMutation,
  useDeleteReviewAdminMutation     as useDeleteReviewAdminMutation,
  useGetReviewReportsQuery,
  useUpdateReportStatusMutation,
} from './reviewsApi';

// ── Organizer Analytics ───────────────────────────────────────────────────────
export {
  organizerAnalyticsApi,
  useGetOrganizerDashboardQuery,
  useGetOrganizerRevenueQuery,
  useExportOrganizerDataMutation,
} from './organizerAnalyticsApi';
