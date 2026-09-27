import { useState, useCallback } from 'react';
import { SlotDto } from '@codeyoung/shared';
import { api } from '@/services/api';

interface UseAvailabilityResult {
  slots: SlotDto[];
  loading: boolean;
  error: string | null;
  load: (date: string, timezone: string) => Promise<void>;
  clear: () => void;
}

export function useAvailability(): UseAvailabilityResult {
  const [slots, setSlots] = useState<SlotDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (date: string, timezone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAvailability(date, timezone);
      setSlots(res.slots);
    } catch {
      setError("We couldn't load available times. Please try again.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setSlots([]);
    setError(null);
  }, []);

  return { slots, loading, error, load, clear };
}
