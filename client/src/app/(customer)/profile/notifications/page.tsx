"use client";

import { useState } from 'react';
import { 
  useGetNotificationsQuery, 
  useMarkAsReadMutation,
  useGetUnreadCountQuery
} from '@/store/api';
import { useAppDispatch } from '@/store/store';
import { markAsRead } from '@/store/notificationSlice';

export default function CustomerNotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const { data, isLoading, refetch } = useGetNotificationsQuery({
    page,
    limit: 20,
    is_read: filter === 'unread' ? false : undefined,
  });

  const { data: unreadCountData } = useGetUnreadCountQuery();
  const [markAsReadMutation] = useMarkAsReadMutation();
  
  const dispatch = useAppDispatch();
  const unreadCount = unreadCountData?.data?.unreadCount ?? 0;
  const totalPages = data?.data?.pagination?.pages ?? 1;

  const handleMarkAsRead = async (id: number) => {
    await markAsReadMutation(id);
    dispatch(markAsRead(id));
    refetch();
  };

  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading notifications...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
              {unreadCount} unread
            </span>
          )}
        </div>

        <div className="bg-white rounded-lg shadow">
          {data?.data?.notifications?.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-gray-500">No notifications found</p>
              </div>
            </div>
          ) : (
            <div className="divide-y">
              {data?.data?.notifications?.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <h3 className={`text-lg font-semibold ${
                          !notification.is_read ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-3">{notification.message}</p>
                      
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>{new Date(notification.created_at).toLocaleString()}</span>
                        <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                          {notification.channel}
                        </span>
                      </div>
                    </div>
                    
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center items-center p-4 border-t">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              
              <span className="mx-4 text-gray-700">
                Page {page} of {totalPages}
              </span>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
