// All organizer operations use RTK Query hooks directly in components.
export {
  useGetOrganizerProfileQuery,
  useUpdateOrganizerProfileMutation,
  useUpdateOrganizerBankDetailsMutation,
  useOrganizerChangePasswordMutation,
  useGetAllOrganizersQuery,
  useGetOrganizerByIdQuery,
  useVerifyOrganizerKycMutation,
  useDeactivateOrganizerMutation,
} from "@/store/api/organizerApi";

export {
  useOrganizerLoginMutation,
  useOrganizerLogoutMutation,
  useOrganizerRegisterMutation,
  useOrganizerVerifyEmailMutation,
  useOrganizerForgotPasswordMutation,
  useOrganizerResetPasswordMutation,
} from "@/store/api/authApi";
