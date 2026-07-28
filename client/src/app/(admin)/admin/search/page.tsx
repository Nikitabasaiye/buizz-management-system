"use client";

import { useState } from 'react';
import { useSearchEventsQuery, useSearchOrganizersQuery, useSearchUsersQuery } from '@/store/api';

export default function SearchPage() {
  const [searchType, setSearchType] = useState<'events' | 'organizers' | 'users'>('events');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    minPrice: 0,
    maxPrice: 10000,
  });

  const { data: eventsData, isLoading: eventsLoading } = useSearchEventsQuery({
    q: searchQuery,
    category: filters.category,
    type: filters.type,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
  });

  const { data: organizersData, isLoading: organizersLoading } = useSearchOrganizersQuery({
    q: searchQuery,
  });

  const { data: usersData, isLoading: usersLoading } = useSearchUsersQuery({
    q: searchQuery,
  });

  const isLoading = eventsLoading || organizersLoading || usersLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            {['events', 'organizers', 'users'].map((type) => (
              <button
                key={type}
                onClick={() => setSearchType(type as any)}
                className={`flex-1 py-4 text-center font-medium transition ${
                  searchType === type
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder={`Search ${searchType}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
            />
            
            {searchType === 'events' && (
              <>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">All Categories</option>
                  {eventsData?.data?.filters?.categories?.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">All Types</option>
                  {eventsData?.data?.filters?.types?.map((type: string) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </>
            )}
            
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : searchType === 'events' ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {eventsData?.data?.pagination?.total || 0} events found
              </h2>
              
              {eventsData?.data?.events?.length === 0 ? (
                <p className="text-gray-500">No events found</p>
              ) : (
                <div className="space-y-4">
                  {eventsData?.data?.events?.map((event: any) => (
                    <div key={event.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50">
                      {event.banner && (
                        <img 
                          src={event.banner} 
                          alt={event.title} 
                          className="w-20 h-20 object-cover rounded-lg mr-4"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{event.title}</h3>
                        <p className="text-gray-600 text-sm">{event.description}</p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span className="mr-4">{event.startDate}</span>
                          <span className="mr-4">{event.venueName}</span>
                          <span>₹{event.minPrice} - ₹{event.maxPrice}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : searchType === 'organizers' ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {organizersData?.data?.pagination?.total || 0} organizers found
              </h2>
              
              {organizersData?.data?.organizers?.length === 0 ? (
                <p className="text-gray-500">No organizers found</p>
              ) : (
                <div className="space-y-4">
                  {organizersData?.data?.organizers?.map((organizer: any) => (
                    <div key={organizer.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-blue-600 font-bold text-lg">
                          {organizer.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{organizer.name}</h3>
                        <p className="text-gray-600 text-sm">{organizer.email}</p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span className="mr-4">{organizer.phone}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            organizer.kycStatus === 'verified' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {organizer.kycStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {usersData?.data?.pagination?.total || 0} users found
              </h2>
              
              {usersData?.data?.users?.length === 0 ? (
                <p className="text-gray-500">No users found</p>
              ) : (
                <div className="space-y-4">
                  {usersData?.data?.users?.map((user: any) => (
                    <div key={user.id} className="flex items-center p-4 border rounded-lg hover:bg-gray-50">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                        <span className="text-gray-600 font-bold text-lg">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{user.name}</h3>
                        <p className="text-gray-600 text-sm">{user.email}</p>
                        <div className="flex items-center mt-2 text-sm text-gray-500">
                          <span className="mr-4">{user.phone}</span>
                          <span className="mr-4">{user.role}</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            user.kycStatus === 'verified' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {user.kycStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
