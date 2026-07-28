"use client";

import { useState } from 'react';
import { 
  useGetSeatMapTemplatesQuery,
  useGetEventSeatMapQuery,
  useUpdateSeatStatusMutation
} from '@/store/api';

type SeatStatus = 'available' | 'booked' | 'blocked';

export default function SeatMapBuilderPage() {
  const [eventId, setEventId] = useState<number>(1);
  const [templateId, setTemplateId] = useState<number | null>(null);
  
  const { data: templates, isLoading: templatesLoading } = useGetSeatMapTemplatesQuery({});
  const { data: seatMap, isLoading: seatMapLoading } = useGetEventSeatMapQuery(eventId);
  const [updateSeatStatus] = useUpdateSeatStatusMutation();
  const seatStatuses = Object.values(seatMap?.override?.seat_status || {}).filter(
    (status): status is SeatStatus => status === 'available' || status === 'booked' || status === 'blocked'
  );

  const handleSeatClick = async (seatId: string) => {
    const currentStatus = seatMap?.override?.seat_status?.[seatId] || 'available';
    const newStatus = currentStatus === 'available' ? 'booked' : 'available';
    
    try {
      await updateSeatStatus({
        eventId,
        seatUpdates: { [seatId]: newStatus }
      });
    } catch (error) {
    }
  };

  if (templatesLoading) return <div className="flex items-center justify-center h-screen">Loading templates...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Seat Map Builder</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Select Event</h2>
              <select
                value={eventId}
                onChange={(e) => setEventId(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="1">Event 1 - Rock Concert</option>
                <option value="2">Event 2 - Comedy Show</option>
                <option value="3">Event 3 - Theater Play</option>
              </select>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Templates</h2>
              <div className="space-y-2">
                {templates?.map((template: any) => (
                  <button
                    key={template.id}
                    onClick={() => setTemplateId(template.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg ${
                      templateId === template.id 
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500' 
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-500">
                      {template.rows} rows × {template.columns} columns
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Legend</h2>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-sm">Available</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-sm">Booked</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-sm">Blocked</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">
                  {seatMapLoading ? 'Loading...' : seatMap?.event?.title || 'Select an event'}
                </h2>
              </div>

              {seatMapLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : seatMap?.template?.layout ? (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    {seatMap.template.layout.map((row: any[], rowIndex: number) => (
                      <div key={rowIndex} className="flex gap-2 mb-2">
                        {row.map((seat: any) => {
                          const rawStatus = seatMap.override?.seat_status?.[seat.id];
                          const status: SeatStatus = rawStatus === 'booked' || rawStatus === 'blocked' ? rawStatus : 'available';
                          const statusColors: Record<SeatStatus, string> = {
                            available: 'bg-green-500 hover:bg-green-600',
                            booked: 'bg-red-500',
                            blocked: 'bg-gray-500',
                          };
                          const statusColor = statusColors[status];

                          return (
                            <div
                              key={seat.id}
                              onClick={() => handleSeatClick(seat.id)}
                              className={`w-10 h-10 rounded flex items-center justify-center cursor-pointer transition-colors ${statusColor}`}
                              title={`${seat.id} - ${status}`}
                            >
                              <span className="text-white font-medium text-sm">{seat.id}</span>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">No seat map available for this event</p>
                </div>
              )}

              {seatMap && !seatMapLoading && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {seatMap.template?.layout?.flat().length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Seats</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {seatStatuses.filter((status) => status === 'available').length}
                    </div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {seatStatuses.filter((status) => status === 'booked').length}
                    </div>
                    <div className="text-sm text-gray-600">Booked</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
