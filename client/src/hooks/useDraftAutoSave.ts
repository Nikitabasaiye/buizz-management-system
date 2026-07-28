import { useEffect, useRef } from 'react';
import { useSaveDraftMutation } from '@/store/api/eventsApi';
import type { CreateEventBody } from '@/store/api/eventsApi';

interface UseDraftAutoSaveOptions {
  eventData: CreateEventBody & { eventId?: number };
  enabled?: boolean;
  debounceMs?: number;
  onSaveSuccess?: (eventId: number) => void;
  onSaveError?: (error: unknown) => void;
}

export function useDraftAutoSave({
  eventData,
  enabled = true,
  debounceMs = 2000,
  onSaveSuccess,
  onSaveError,
}: UseDraftAutoSaveOptions) {
  const [saveDraft, { isLoading, error }] = useSaveDraftMutation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  useEffect(() => {
    if (!enabled) return;

    // Skip if data hasn't changed
    const currentData = JSON.stringify(eventData);
    if (currentData === lastSavedDataRef.current) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await saveDraft(eventData).unwrap();
        if (result.data?.event?.id) {
          lastSavedDataRef.current = currentData;
          onSaveSuccess?.(result.data.event.id);
        }
      } catch (err) {
        onSaveError?.(err);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [eventData, enabled, debounceMs, saveDraft, onSaveSuccess, onSaveError]);

  return {
    isSaving: isLoading,
    error,
    saveDraft: () => saveDraft(eventData),
  };
}
