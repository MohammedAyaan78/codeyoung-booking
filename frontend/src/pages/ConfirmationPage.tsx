import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Clock, Globe, Video, Copy, ExternalLink, ArrowLeft } from 'lucide-react';
import { BookingConfirmation } from '@codeyoung/shared';
import { api } from '@/services/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

export function ConfirmationPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    (location.state as { confirmation?: BookingConfirmation })?.confirmation ?? null
  );
  const [loading, setLoading] = useState(!confirmation);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!confirmation && bookingId) {
      api
        .getBooking(bookingId)
        .then(setConfirmation)
        .catch(() => setError('Could not load booking details.'))
        .finally(() => setLoading(false));
    }
  }, [bookingId, confirmation]);

  const copyLink = async () => {
    if (!confirmation) return;
    await navigator.clipboard.writeText(confirmation.meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !confirmation) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="error" title="Booking not found">
            {error ?? 'This booking could not be found.'}
          </Alert>
          <button onClick={() => navigate('/')} className="btn-secondary mt-4 w-full">
            Return home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Header */}
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link to="/" className="p-2 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Back to home">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CY</span>
            </div>
            <span className="font-bold text-stone-800">CodeYoung</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Success header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Trial class booked!</h1>
          <p className="text-stone-500 mt-1">
            You're all set, {confirmation.parent.name.split(' ')[0]}.
          </p>
          <p className="text-xs text-stone-400 mt-2 font-mono">
            Booking ID: {confirmation.bookingId}
          </p>
        </motion.div>

        {/* Details card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card p-6 space-y-5 mb-4"
        >
          {/* Parent time */}
          <Section icon={<Calendar className="w-5 h-5 text-brand-500" />} title="Your class">
            <p className="font-semibold text-stone-800">{confirmation.parent.localDate}</p>
            <p className="text-stone-600 mt-0.5">
              {confirmation.parent.localStart} — {confirmation.parent.localEnd}
            </p>
            <p className="text-sm text-stone-500 mt-0.5 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {confirmation.parent.timezone}
            </p>
          </Section>

          <div className="border-t border-stone-100" />

          {/* Mentor */}
          <Section icon={<Clock className="w-5 h-5 text-brand-500" />} title="Your mentor">
            <p className="font-semibold text-stone-800">{confirmation.mentor.name}</p>
            <p className="text-stone-600 mt-0.5">
              {confirmation.mentor.localStart} — {confirmation.mentor.localEnd}
            </p>
            <p className="text-sm text-stone-500 mt-0.5 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              {confirmation.mentor.timezone} (mentor's local time)
            </p>
          </Section>

          <div className="border-t border-stone-100" />

          {/* Meeting link */}
          <Section icon={<Video className="w-5 h-5 text-brand-500" />} title="Join your class">
            <a
              href={confirmation.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-medium text-sm break-all"
            >
              {confirmation.meetingUrl}
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
            </a>
          </Section>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <a
            href={confirmation.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 text-center"
          >
            <Video className="w-4 h-4" />
            Open Demo Class
          </a>
          <button onClick={copyLink} className="btn-secondary flex-1">
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy Meeting Link'}
          </button>
        </motion.div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
            ← Book another class
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-1">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}
