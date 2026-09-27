import { motion } from 'framer-motion';
import { SlotDto } from '@codeyoung/shared';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { Clock } from 'lucide-react';

interface SlotGridProps {
  slots: SlotDto[];
  selectedSlot: SlotDto | null;
  loading: boolean;
  onSelect: (slot: SlotDto) => void;
}

export function SlotGrid({ slots, selectedSlot, loading, onSelect }: SlotGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" aria-busy="true" aria-label="Loading available times">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  const available = slots.filter((s) => s.available);
  const unavailable = slots.filter((s) => !s.available);

  if (slots.length === 0) {
    return (
      <div className="text-center py-10 text-stone-500">
        <Clock className="w-10 h-10 mx-auto mb-3 text-stone-300" />
        <p className="font-medium">No slots available for this date.</p>
        <p className="text-sm mt-1">Try selecting a different date.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-stone-500 mb-3 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        Times shown in your local timezone
      </p>

      <div
        className="grid grid-cols-3 sm:grid-cols-4 gap-2"
        role="group"
        aria-label="Available time slots"
      >
        {available.map((slot) => {
          const isSelected = selectedSlot?.startUtc === slot.startUtc;
          return (
            <motion.button
              key={slot.startUtc}
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(slot)}
              aria-pressed={isSelected}
              className={cn(
                'py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-200 border-2',
                isSelected
                  ? 'bg-brand-500 text-white border-brand-500 shadow-md'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50'
              )}
            >
              {slot.localStart.split(' ').slice(0, 2).join(' ')}
            </motion.button>
          );
        })}

        {unavailable.map((slot) => (
          <button
            key={slot.startUtc}
            type="button"
            disabled
            aria-disabled="true"
            className="py-3 px-2 rounded-xl text-sm font-medium border-2 border-stone-100 bg-stone-50 text-stone-300 cursor-not-allowed line-through"
          >
            {slot.localStart.split(' ').slice(0, 2).join(' ')}
          </button>
        ))}
      </div>

      {available.length === 0 && unavailable.length > 0 && (
        <p className="text-center text-sm text-stone-500 mt-4">
          All slots for this date are fully booked. Please try another date.
        </p>
      )}
    </div>
  );
}
