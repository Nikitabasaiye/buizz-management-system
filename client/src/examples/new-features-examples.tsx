'use client';

import { useState, useEffect } from 'react';
import { 
  useSearchEventsQuery, 
  useGetSeatMapTemplatesQuery, 
  useGetEventSeatMapQuery,
  useUpdateSeatStatusMutation,
  useCheckInTicketMutation,
  useGetCheckinStatsQuery,
  useGetNotificationsQuery,
  useMarkAsReadMutation
} from '@/store/api';
import { useAppDispatch, useAppSelector } from '@/store/store';
import { addNotification, markAsRead } from '@/store/notificationSlice';

// Example: Search Events Page
export default function SearchEventsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    minPrice: 0,
    maxPrice: 10000,
  });

  const { data, isLoading, isError } = useSearchEventsQuery({
    q: searchQuery,
    category: filters.category,
    type: filters.type,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading events</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Search Events</h1>
      
      {/* Search Form */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 rounded w-full mb-2"
        />
        
        <div className="flex gap-2">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="">All Categories</option>
            {data?.data?.filters?.categories?.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="">All Types</option>
            {data?.data?.filters?.types?.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="grid gap-4">
        {data?.data?.events?.map((event) => (
          <div key={event.id} className="border p-4 rounded shadow">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <p className="text-gray-600">{event.description}</p>
            <div className="mt-2">
              <span className="text-sm text-gray-500">{event.startDate}</span>
              <span className="text-sm text-gray-500 ml-2">{event.venueName}</span>
            </div>
            <div className="mt-2">
              <span className="text-sm font-medium">
                ₹{event.minPrice} - ₹{event.maxPrice}
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {event.availableSeats} seats available
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example: Seat Map Builder Page
export function SeatMapBuilderPage() {
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [eventId, setEventId] = useState<number>(1);
  
  const { data: templates, isLoading: templatesLoading } = useGetSeatMapTemplatesQuery({});
  const { data: seatMap, isLoading: seatMapLoading } = useGetEventSeatMapQuery(eventId);
  
  const [updateSeatStatus] = useUpdateSeatStatusMutation();

  const handleSeatClick = async (seatId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'available' ? 'booked' : 'available';
    
    await updateSeatStatus({
      eventId,
      seatUpdates: { [seatId]: newStatus }
    });
  };

  if (templatesLoading) return <div>Loading templates...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Seat Map Builder</h1>
      
      {/* Template Selection */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Templates</h2>
        <div className="flex gap-2">
          {templates?.map((template) => (
            <button
              key={template.id}
              onClick={() => setTemplateId(template.id)}
              className={`p-2 rounded ${templateId === template.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Seat Map Display */}
      {seatMapLoading ? (
        <div>Loading seat map...</div>
      ) : (
        <div className="border p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Event: {seatMap?.event?.title}</h2>
          
          {/* Render seat map based on template/override */}
          <div className="grid gap-1">
            {seatMap?.template?.layout?.map((row: any[], rowIndex: number) => (
              <div key={rowIndex} className="flex gap-1">
                {row.map((seat: any) => (
                  <div
                    key={seat.id}
                    onClick={() => handleSeatClick(seat.id, seatMap?.override?.seat_status?.[seat.id] || 'available')}
                    className={`w-8 h-8 rounded flex items-center justify-center cursor-pointer ${
                      seatMap?.override?.seat_status?.[seat.id] === 'booked' 
                        ? 'bg-red-500' 
                        : seatMap?.override?.seat_status?.[seat.id] === 'blocked'
                        ? 'bg-gray-500'
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {seat.id}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Example: Check-in Scanner Page
export function CheckInScannerPage() {
  const [eventId, setEventId] = useState<number>(1);
  const [ticketInput, setTicketInput] = useState('');
  const [scannerId] = useState('SCANNER_001');
  
  const [checkInTicket] = useCheckInTicketMutation();
  const { data: stats } = useGetCheckinStatsQuery(eventId);

  const handleCheckIn = async () => {
    try {
      const result = await checkInTicket({
        eventId,
        data: {
          ticketNumber: ticketInput,
          scannerId,
          notes: 'Entry gate A'
        }
      });
      
      if (result.data?.success) {
        alert(`Checked in: ${result.data.data.userName}`);
        setTicketInput('');
      } else {
        alert(result.data?.message || 'Failed to check in');
      }
    } catch (error) {
      alert('Check-in failed');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Check-in Scanner</h1>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded">
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
            <div className="text-sm text-gray-600">Total Tickets</div>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <div className="text-2xl font-bold">{stats.checkedIn}</div>
            <div className="text-sm text-gray-600">Checked In</div>
          </div>
          <div className="bg-gray-100 p-4 rounded">
            <div className="text-2xl font-bold">{stats.checkinRate}%</div>
            <div className="text-sm text-gray-600">Check-in Rate</div>
          </div>
        </div>
      )}

      {/* Scanner Input */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Enter ticket number or ID"
          value={ticketInput}
          onChange={(e) => setTicketInput(e.target.value)}
          className="border p-3 rounded w-full mb-2 text-lg"
        />
        <button
          onClick={handleCheckIn}
          className="bg-green-500 text-white px-6 py-3 rounded font-semibold w-full"
        >
          Check In Ticket
        </button>
      </div>
    </div>
  );
}

// Example: Notifications Center
export function NotificationsCenter() {
  const dispatch = useAppDispatch();
  const { data, isLoading } = useGetNotificationsQuery({ page: 1, limit: 20 });
  const [markAsReadMutation] = useMarkAsReadMutation();

  const handleMarkAsRead = async (id: number) => {
    await markAsReadMutation(id);
    dispatch(markAsRead(id));
  };

  if (isLoading) return <div>Loading notifications...</div>;

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      
      <div className="space-y-2">
        {data?.data?.notifications?.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded border ${
              !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`font-semibold ${!notification.is_read ? 'text-blue-900' : 'text-gray-900'}`}>
                  {notification.title}
                </h3>
                <p className="text-gray-600 mt-1">{notification.message}</p>
                <div className="text-sm text-gray-500 mt-2">
                  {new Date(notification.created_at).toLocaleString()}
                </div>
              </div>
              {!notification.is_read && (
                <button
                  onClick={() => handleMarkAsRead(notification.id)}
                  className="text-blue-500 text-sm hover:text-blue-700"
                >
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example: Real-time Notification Hook Usage
export function RealTimeNotificationsExample() {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount } = useAppSelector((state) => state.notification);

  // This would be connected to socket.io in a real app
  // Mock notification generation removed - use real backend notifications
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const mockNotification = {
  //       id: Date.now(),
  //       user_id: 1,
  //       title: 'New Booking',
  //       message: 'You have a new booking for your event',
  //       channel: 'booking_confirmed',
  //       related_type: 'booking',
  //       related_id: 123,
  //       metadata: {},
  //       is_read: false,
  //       created_at: new Date().toISOString(),
  //     };
  //     dispatch(addNotification(mockNotification));
  //   }, 30000);
  //   return () => clearInterval(interval);
  // }, [dispatch]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Real-time Notifications</h1>
      
      <div className="mb-4">
        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
          {unreadCount} unread
        </span>
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-3 rounded border ${
              !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
            }`}
          >
            <h3 className="font-semibold">{notification.title}</h3>
            <p className="text-gray-600">{notification.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
