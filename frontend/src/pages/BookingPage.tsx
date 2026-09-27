import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { CYLogo } from '@/components/ui/CYLogo';
import { SlotDto, TimezoneOption } from '@codeyoung/shared';

import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useAvailability } from '@/hooks/useAvailability';
import { StepIndicator } from '@/features/booking/StepIndicator';
import { ParentDetailsForm, ParentDetailsFormData } from '@/features/booking/ParentDetailsForm';
import { DatePicker } from '@/features/booking/DatePicker';
import { SlotGrid } from '@/features/booking/SlotGrid';
import { BookingSummary } from '@/features/booking/BookingSummary';
import { Alert } from '@/components/ui/Alert';
import { BookingStep, BookingFlowState } from '@/types';

export function BookingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Authenticated parents skip step 1 — details come from session
  const isAuthenticated = user?.role === 'PARENT';
  const [step, setStep] = useState<BookingStep>(isAuthenticated ? 2 : 1);
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alternativeSlots, setAlternativeSlots] = useState<SlotDto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { slots, loading: slotsLoading, error: slotsError, load: loadSlots } = useAvailability();

  const [booking, setBooking] = useState<BookingFlowState>({
    // Pre-fill from session for authenticated parents
    parentDetails: isAuthenticated && user
      ? {
          parentName: user.name,
          parentEmail: user.email,
          parentPhone: '',
          parentTimezone: user.timezone !== 'UTC' ? user.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
        }
      : null,
    selectedDate: null,
    selectedSlot: null,
    idempotencyKey: uuidv4(),
  });

  // Load timezones once on mount
  useEffect(() => {
    api.getTimezones().then((r) => setTimezones(r.timezones)).catch(console.error);
  }, []);

  // Reload slots whenever date or timezone changes
  useEffect(() => {
    if (booking.selectedDate && booking.parentDetails?.parentTimezone) {
      // Normalise deprecated aliases (Asia/Calcutta → Asia/Kolkata) before API call
      import('luxon').then(({ DateTime }) => {
        const canonical = DateTime.now().setZone(booking.parentDetails!.parentTimezone).zoneName
          ?? booking.parentDetails!.parentTimezone;
        loadSlots(booking.selectedDate!, canonical);
      });
    }
  }, [booking.selectedDate, booking.parentDetails?.parentTimezone, loadSlots]);

  const handleDetailsSubmit = (data: ParentDetailsFormData) => {
    setBooking((prev) => ({ ...prev, parentDetails: data, selectedSlot: null }));
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setBooking((prev) => ({ ...prev, selectedDate: date, selectedSlot: null }));
  };

  const handleSlotSelect = (slot: SlotDto) => {
    setBooking((prev) => ({ ...prev, selectedSlot: slot }));
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!booking.parentDetails || !booking.selectedSlot) return;

    setIsSubmitting(true);
    setSubmitError(null);

    // Normalise deprecated IANA aliases (e.g. Asia/Calcutta → Asia/Kolkata)
    // Luxon resolves the canonical name via the IANA DB
    const { DateTime } = await import('luxon');
    const rawTz = booking.parentDetails.parentTimezone;
    const canonicalTz = DateTime.now().setZone(rawTz).zoneName ?? rawTz;

    try {
      // Use authenticated endpoint when logged in as parent
      const confirmation = isAuthenticated
        ? await api.createAuthenticatedBooking(
            {
              parentTimezone: canonicalTz,
              startUtc: booking.selectedSlot.startUtc,
            },
            booking.idempotencyKey
          )
        : await api.createBooking(
            {
              parentName: booking.parentDetails.parentName,
              parentEmail: booking.parentDetails.parentEmail,
              parentPhone: booking.parentDetails.parentPhone,
              parentTimezone: canonicalTz,
              startUtc: booking.selectedSlot.startUtc,
            },
            booking.idempotencyKey
          );

      navigate(`/confirmation/${confirmation.bookingId}`, {
        state: { confirmation },
      });
    } catch (err: unknown) {
      const apiErr = err as { error?: { code?: string; message?: string; alternatives?: SlotDto[]; details?: { fieldErrors?: Record<string, string[]> } } };
      const code = apiErr?.error?.code;
      const details = apiErr?.error?.details?.fieldErrors;
      const detailMsg = details
        ? Object.entries(details).map(([f, msgs]) => `${f}: ${msgs[0]}`).join(', ')
        : null;
      const message = detailMsg
        ? `${apiErr?.error?.message ?? 'Invalid request'} (${detailMsg})`
        : apiErr?.error?.message ?? 'Something went wrong. Please try again.';

      if (code === 'SLOT_TAKEN' || code === 'NO_AVAILABILITY') {
        setSubmitError(message);
        setAlternativeSlots(apiErr?.error?.alternatives ?? []);
        // Refresh availability so the grid reflects the current state
        if (booking.selectedDate && booking.parentDetails?.parentTimezone) {
          loadSlots(booking.selectedDate, booking.parentDetails.parentTimezone);
        }
        setStep(2);
      } else {
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const timezone = booking.parentDetails?.parentTimezone ?? 'UTC';

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </button>
          <div className="flex items-center gap-2">
            <CYLogo className="w-7 h-7" />
            <span className="font-bold text-stone-800">Book a Trial Class</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Step indicator */}
        <div className="mb-8">
          <StepIndicator currentStep={step} />
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6"
            >
              <Alert variant="error" title="Booking failed">
                {submitError}
                {alternativeSlots.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Try one of these times instead:</p>
                    <div className="flex flex-wrap gap-2">
                      {alternativeSlots.map((s) => (
                        <button
                          key={s.startUtc}
                          onClick={() => {
                            setBooking((prev) => ({ ...prev, selectedSlot: s }));
                            setSubmitError(null);
                            setAlternativeSlots([]);
                            setStep(3);
                          }}
                          className="text-xs bg-white border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {s.localStart}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Parent Details — only shown for unauthenticated users */}
        {step === 1 && !isAuthenticated && (
          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-stone-900 mb-1">Your details</h2>
            <p className="text-stone-500 text-sm mb-6">
              Tell us a bit about yourself so we can set up your trial class.
            </p>
            <ParentDetailsForm
              defaultValues={booking.parentDetails ?? undefined}
              timezones={timezones}
              onSubmit={handleDetailsSubmit}
            />
          </div>
        )}

        {/* Step 2: Date + Slot */}
        {step === 2 && booking.parentDetails && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">Choose a date</h2>
                  <p className="text-stone-500 text-sm mt-0.5">
                    Showing times in{' '}
                    <span className="font-medium text-stone-700">{timezone}</span>
                  </p>
                </div>
                {!isAuthenticated && (
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  Edit details
                </button>
              )}
              </div>

              <DatePicker
                selectedDate={booking.selectedDate}
                timezone={timezone}
                onSelect={handleDateSelect}
              />
            </div>

            {booking.selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
              >
                <h2 className="text-xl font-bold text-stone-900 mb-4">Choose a time</h2>

                {slotsError ? (
                  <Alert variant="error">
                    {slotsError}
                    <button
                      onClick={() => loadSlots(booking.selectedDate!, timezone)}
                      className="block mt-2 text-sm font-medium underline"
                    >
                      Try again
                    </button>
                  </Alert>
                ) : (
                  <SlotGrid
                    slots={slots}
                    selectedSlot={booking.selectedSlot}
                    loading={slotsLoading}
                    onSelect={handleSlotSelect}
                  />
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 3: Summary + Confirm */}
        {step === 3 && booking.parentDetails && booking.selectedSlot && (
          <BookingSummary
            parentName={booking.parentDetails.parentName}
            parentTimezone={booking.parentDetails.parentTimezone}
            slot={booking.selectedSlot}
            onConfirm={handleConfirm}
            onBack={() => setStep(2)}
            isSubmitting={isSubmitting}
          />
        )}
      </main>
    </div>
  );
}
