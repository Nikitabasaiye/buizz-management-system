/**
 * Extracts a user-friendly error message from any RTK Query / fetch error shape.
 */
export function getApiError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;

  // RTK Query FetchBaseQueryError
  const e = error as any;

  // Server returned a JSON body with a message field
  if (e?.data?.message) return String(e.data.message);
  if (Array.isArray(e?.data?.errors) && e.data.errors.length) {
    return String(e.data.errors[0]?.msg ?? e.data.errors[0]?.message ?? 'Validation failed. Please check your input.');
  }
  if (e?.data?.error)   return String(e.data.error);

  // Network / fetch level error
  if (e?.error)  return String(e.error);
  if (e?.message) return String(e.message);

  // HTTP status fallbacks
  if (e?.status === 400) return 'Invalid request. Please check your input.';
  if (e?.status === 401) return 'Session expired. Please log in again.';
  if (e?.status === 403) return 'You do not have permission to perform this action.';
  if (e?.status === 404) return 'The requested resource was not found.';
  if (e?.status === 409) return 'A conflict occurred. This record may already exist.';
  if (e?.status === 422) return 'Validation failed. Please check your input.';
  if (e?.status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (e?.status === 500) return 'Server error. Please try again later.';
  if (e?.status === 503) return 'Service unavailable. Please try again later.';
  if (e?.status === 'FETCH_ERROR') return 'Network error. Please check your internet connection.';
  if (e?.status === 'TIMEOUT_ERROR') return 'Request timed out. Please try again.';
  if (e?.status === 'PARSING_ERROR') return 'Unexpected server response. Please try again.';

  return fallback;
}

/**
 * Returns true if the error is a 401 Unauthorized.
 */
export function isUnauthorized(error: unknown): boolean {
  return (error as any)?.status === 401;
}

/**
 * Returns true if the error is a network/fetch error.
 */
export function isNetworkError(error: unknown): boolean {
  return (error as any)?.status === 'FETCH_ERROR';
}
