import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalToday, addDays } from '@/utils/date';

interface DatePickerProps {
  selectedDate: string | null; // YYYY-MM-DD
  timezone: string;
  onSelect: (date: string) => void;
}

function formatDisplayDate(dateStr: string): { weekday: string; day: string; month: string } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return {
    weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
    day: String(d),
    month: dt.toLocaleDateString('en-US', { month: 'short' }),
  };
}

function formatMonthYear(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function DatePicker({ selectedDate, timezone, onSelect }: DatePickerProps) {
  const today = getLocalToday(timezone);
  const [windowStart, setWindowStart] = useState(today);

  const days = Array.from({ length: 7 }, (_, i) => addDays(windowStart, i));
  const canGoBack = windowStart > today;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-stone-800">{formatMonthYear(windowStart)}</h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setWindowStart(addDays(windowStart, -7))}
            disabled={!canGoBack}
            className="p-2 rounded-lg hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setWindowStart(addDays(windowStart, 7))}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Select a date">
        {days.map((dateStr) => {
          const { weekday, day, month } = formatDisplayDate(dateStr);
          const isSelected = dateStr === selectedDate;
          const isPast = dateStr < today;
          const isToday = dateStr === today;

          return (
            <motion.button
              key={dateStr}
              type="button"
              whileHover={!isPast ? { scale: 1.05 } : {}}
              whileTap={!isPast ? { scale: 0.97 } : {}}
              onClick={() => !isPast && onSelect(dateStr)}
              disabled={isPast}
              aria-label={`${weekday} ${day} ${month}${isToday ? ', today' : ''}`}
              aria-pressed={isSelected}
              className={cn(
                'flex flex-col items-center py-2.5 px-1 rounded-xl text-center transition-all duration-200',
                isSelected && 'bg-brand-500 text-white shadow-md',
                !isSelected && !isPast && 'hover:bg-brand-50 hover:text-brand-700 cursor-pointer',
                isPast && 'opacity-30 cursor-not-allowed',
                isToday && !isSelected && 'ring-2 ring-brand-300'
              )}
            >
              <span className="text-xs font-medium opacity-70">{weekday}</span>
              <span className="text-lg font-bold leading-tight">{day}</span>
              <span className="text-xs opacity-70">{month}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
