'use client';

import { useGetEventsQuery } from '@/store/api/eventsApi';
import { useAppSelector } from '@/store/reduxStore';

export default function TestIntegrationPage() {
  const { data, isLoading, error, isError } = useGetEventsQuery({ page: 1, limit: 10 });
  const authUser = useAppSelector(state => state.auth.user);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Backend-Frontend Integration Test</h1>
      
      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>1. Environment Check</h2>
        <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'NOT SET ❌'}</p>
        <p><strong>Expected:</strong> http://localhost:5000/api/v1</p>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>2. Redux Store Status</h2>
        <p><strong>Auth User:</strong> {authUser ? `${authUser.name} (${authUser.email})` : 'Not logged in'}</p>
        <p><strong>Is Authenticated:</strong> {useAppSelector(state => state.auth.isAuthenticated) ? '✅' : '❌'}</p>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>3. API Test: GET /api/v1/events</h2>
        
        {isLoading && (
          <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
            ⏳ Loading events from backend...
          </div>
        )}

        {isError && (
          <div style={{ padding: '10px', background: '#f8d7da', borderRadius: '4px' }}>
            <strong>❌ Error:</strong>
            <pre style={{ marginTop: '10px', overflow: 'auto' }}>
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}

        {data && (
          <div style={{ padding: '10px', background: '#d4edda', borderRadius: '4px' }}>
            <strong>✅ Success! Retrieved {data.data?.events?.length || 0} events</strong>
            <pre style={{ marginTop: '10px', overflow: 'auto', maxHeight: '300px' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        {!isLoading && !isError && !data && (
          <div style={{ padding: '10px', background: '#fff3cd', borderRadius: '4px' }}>
            ⚠️ No data loaded yet
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px' }}>
        <h2>Troubleshooting Checklist</h2>
        <ul>
          <li>✅ Backend server running on http://localhost:5000</li>
          <li>✅ .env.local file exists with NEXT_PUBLIC_API_URL</li>
          <li>✅ CORS configured to allow http://127.0.0.1:3000</li>
          <li>✅ Redux store integrated in GlobalProviders</li>
          <li>Check browser console for errors</li>
          <li>Check Network tab in DevTools</li>
          <li>Test backend directly: http://localhost:5000/api/v1/events</li>
        </ul>
      </div>
    </div>
  );
}
