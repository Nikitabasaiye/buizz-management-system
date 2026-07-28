import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { apiSlice } from './apiSlice';
import { platformApi } from './api/platformApi';
import authReducer from './authSlice';
import notificationReducer from './notificationSlice';

// Eagerly register all injected endpoint slices
import './api/authApi';
import './api/adminApi';
import './api/auditApi';
import './api/eventsApi';
import './api/bookingsApi';
import './api/ticketsApi';
import './api/usersApi';
import './api/analyticsApi';
import './api/checkinApi';
import './api/digitalProductApi';
import './api/eventApprovalApi';
import './api/influencerApi';
import './api/kycApi';
import './api/launchApi';
import './api/notificationsApi';
import './api/organizationApi';
import './api/organizerApi';
import './api/organizerAnalyticsApi';
import './api/organizersApi';
import './api/paymentsApi';
import './api/platformApi';
import './api/reviewsApi';
import './api/searchApi';
import './api/seatmapApi';
import './api/seatmapsApi';
import './api/settlementsApi';
import './api/supportApi';
import './api/whatsappApi';

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    [platformApi.reducerPath]: platformApi.reducer,
    auth: authReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware, platformApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { useDispatch, useSelector } from 'react-redux';
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
