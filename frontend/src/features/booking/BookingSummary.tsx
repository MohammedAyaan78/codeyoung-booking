import { motion } from 'framer-motion';
import { SlotDto } from '@codeyoung/shared';
import { Calendar, Clock, Globe, Video, User } from 'lucide-react';

interface BookingSummaryProps {
  parentName: string;
  parentTimezone: string;
  slot: SlotDto;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function BookingSummary({
  parentName,
  parentTimezone,
  slot,
  onConfirm,
  onBack,
  isSubmitting,
}: BookingSummaryProps) {
  // Format the date from the slot's localStart
  const slotDate = new Date(slot.startUtc);
  const localDate = slotDate.toLocaleDateString('en-US', {
    timeZone: parentTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-stone-800 text-base">Booking Summary</h3>

        <div className="space-y-3 divide-y divide-stone-100">
          <SummaryRow icon={<User className="w-4 h-4 text-brand-500" />} label="Parent">
            {parentName}
          </SummaryRow>

          <SummaryRow icon={<Calendar className="w-4 h-4 text-brand-500" />} label="Date" padded>
            {localDate}
          </SummaryRow>

          <SummaryRow icon={<Clock className="w-4 h-4 text-brand-500" />} label="Your time" padded>
            <span className="font-semibold">{slot.localStart} — {slot.localEnd}</span>
          </SummaryRow>

          <SummaryRow icon={<Globe className="w-4 h-4 text-brand-500" />} label="Your timezone" padded>
            {parentTimezone}
          </SummaryRow>

          <SummaryRow icon={<Video className="w-4 h-4 text-brand-500" />} label="Duration" padded>
            30 minutes
          </SummaryRow>
        </div>
      </div>

      <p className="text-xs text-stone-500 text-center">
        A mentor will be automatically assigned to your session.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="btn-secondary flex-1"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="btn-primary flex-1"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Booking…
            </span>
          ) : (
            'Confirm Booking'
          )}
        </button>
      </div>
    </motion.div>
  );
}

function SummaryRow({
  icon,
  label,
  children,
  padded,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  padded?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${padded ? 'pt-3' : ''}`}>
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-stone-800 font-medium mt-0.5">{children}</p>
      </div>
    </div>
  );
}
