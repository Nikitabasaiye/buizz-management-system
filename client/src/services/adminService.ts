// All admin operations use RTK Query hooks directly in components.
export {
  useGetAdminProfileQuery,
  useUpdateAdminProfileMutation,
  useAdminLoginMutation,
  useAdminLogoutMutation,
  useGetAllAdminsQuery,
  useDeactivateAdminMutation,
} from "@/store/api/adminApi";

export {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useUpdateUserRoleMutation,
} from "@/store/api/usersApi";

export {
  useGetDashboardQuery,
  useGetEventAnalyticsQuery,
} from "@/store/api/analyticsApi";
