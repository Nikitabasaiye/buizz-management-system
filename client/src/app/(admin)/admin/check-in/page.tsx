"use client";

import { useState } from 'react';
import { useCheckInTicketMutation, useGetCheckinStatsQuery } from '@/store/api';

export default function CheckInScannerPage() {
  const [eventId, setEventId] = useState<number>(1);
  const [ticketInput, setTicketInput] = useState('');
  const [scannerId] = useState('SCANNER_001');
  
  const [checkInTicket, { isLoading }] = useCheckInTicketMutation();
  const { data: stats, isLoading: statsLoading } = useGetCheckinStatsQuery(eventId);

  const handleCheckIn = async () => {
    if (!ticketInput.trim()) {
      alert('Please enter a ticket number');
      return;
    }

    try {
      const result = await checkInTicket({
        eventId,
        data: {
          ticketNumber: ticketInput,
          scannerId,
          notes: 'Entry gate A'
        }
      }).unwrap();
      
      if (result.success) {
        alert(`Checked in: ${result.data.userName}`);
        setTicketInput('');
      } else {
        alert(result.message || 'Failed to check in');
      }
    } catch (error: any) {
      alert(error.data?.message || 'Check-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Check-in Scanner</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Check-in Statistics</h2>
              
              {statsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : stats ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalTickets}</div>
                    <div className="text-sm text-gray-600">Total Tickets</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
                    <div className="text-sm text-gray-600">Checked In</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-600">{stats.checkinRate}%</div>
                    <div className="text-sm text-gray-600">Check-in Rate</div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Select an event to view stats</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Event Selection</h2>
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
          </div>

          {/* Scanner Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-8">
              <h2 className="text-xl font-semibold mb-6">Ticket Scanner</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Ticket Number or ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter ticket number (e.g., TKT001)"
                    value={ticketInput}
                    onChange={(e) => setTicketInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                  />
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={isLoading || !ticketInput.trim()}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition ${
                    isLoading || !ticketInput.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-2"></div>
                      Checking In...
                    </div>
                  ) : (
                    'Check In Ticket'
                  )}
                </button>

                {stats?.byHour && stats.byHour.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Check-in by Hour</h3>
                    <div className="space-y-2">
                      {stats.byHour.map((hour: any) => (
                        <div key={hour.hour} className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {hour.hour}:00 - {hour.hour}:59
                          </span>
                          <div className="flex items-center">
                            <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${(hour.count / (stats.totalTickets || 1)) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{hour.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
