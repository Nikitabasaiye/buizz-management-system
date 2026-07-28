import { apiSlice } from '../apiSlice';

interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  channel: string;
  related_type: string | null;
  related_id: number | null;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface NotificationResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<NotificationResponse, { page?: number; limit?: number; channel?: string; is_read?: boolean; relatedType?: string }>({
      query: (params) => ({
        url: '/notifications',
        params,
      }),
      providesTags: ['Notification'],
    }),
    
    getNotificationById: builder.query<Notification, number>({
      query: (id) => `/notifications/${id}`,
      providesTags: (result, error, id) => [{ type: 'Notification', id }],
    }),
    
    markAsRead: builder.mutation<Notification, number>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (result, error, id) => [{ type: 'Notification', id }],
    }),
    
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    
    deleteNotification: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
    
    deleteAllNotifications: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/notifications',
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),
    
    getUnreadCount: builder.query<UnreadCountResponse, void>({
      query: () => '/notifications/unread/count',
      providesTags: ['Notification'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetNotificationByIdQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useGetUnreadCountQuery,
} = notificationApi;
