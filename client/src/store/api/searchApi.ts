import { apiSlice } from '../apiSlice';

interface EventSearchResponse {
  success: boolean;
  data: {
    events: Array<{
      id: number;
      title: string;
      description: string;
      startDate: string;
      endDate: string;
      type: string;
      category: string;
      venueName: string;
      venueCity: string;
      venueState: string;
      minPrice: number;
      maxPrice: number;
      availableSeats: number;
      totalSeats: number;
      banner: string;
      organizer: {
        name: string;
        email: string;
        phone: string;
      };
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    filters: {
      categories: string[];
      types: string[];
    };
  };
}

interface OrganizerSearchResponse {
  success: boolean;
  data: {
    organizers: Array<{
      id: number;
      name: string;
      email: string;
      phone: string;
      avatar: string;
      kycStatus: string;
      bankVerificationStatus: string;
      eventsCount: number;
      totalBookings: number;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface UserSearchResponse {
  success: boolean;
  data: {
    users: Array<{
      id: number;
      name: string;
      email: string;
      phone: string;
      avatar: string;
      role: string;
      kycStatus: string;
      bankVerificationStatus: string;
      createdAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

interface AdvancedSearchRequest {
  query?: string;
  categories?: string[];
  types?: string[];
  dateRange?: { start?: string; end?: string };
  location?: { city?: string; state?: string };
  priceRange?: { min?: number; max?: number };
  availability?: 'available' | 'soldOut';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface AutocompleteResponse {
  success: boolean;
  data: {
    results: {
      events: Array<{ id: number; name: string; banner: string; start_date: string }>;
      organizers: Array<{ id: number; name: string; avatar: string }>;
      categories: Array<{ name: string }>;
      locations: Array<{ name: string }>;
    };
  };
}

export const searchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public search (no auth required)
    searchEvents: builder.query<EventSearchResponse, { q?: string; category?: string; type?: string; startDate?: string; endDate?: string; city?: string; state?: string; minPrice?: number; maxPrice?: number; availableOnly?: boolean; page?: number; limit?: number }>({
      query: (params) => ({
        url: '/search/events',
        params,
      }),
      providesTags: ['Search'],
    }),
    
    searchOrganizers: builder.query<OrganizerSearchResponse, { q?: string; kycStatus?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: '/search/organizers',
        params,
      }),
      providesTags: ['Search'],
    }),
    
    searchUsers: builder.query<UserSearchResponse, { q?: string; kycStatus?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: '/search/users',
        params,
      }),
      providesTags: ['Search'],
    }),
    
    advancedEventSearch: builder.mutation<EventSearchResponse, AdvancedSearchRequest>({
      query: (data) => ({
        url: '/search/events/advanced',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Search'],
    }),
    
    autocomplete: builder.query<AutocompleteResponse, { q: string; type?: 'events' | 'organizers' | 'categories' | 'locations' }>({
      query: (params) => ({
        url: '/search/autocomplete',
        params,
      }),
      providesTags: ['Search'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSearchEventsQuery,
  useSearchOrganizersQuery,
  useSearchUsersQuery,
  useAdvancedEventSearchMutation,
  useAutocompleteQuery,
} = searchApi;
