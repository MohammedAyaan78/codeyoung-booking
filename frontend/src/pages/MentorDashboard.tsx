import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Globe, Video, LogOut, User, Users } from 'lucide-react';
import { DashboardBooking, MentorCapacity } from '@codeyoung/shared';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">CY</span>
          </div>
          <span className="font-bold text-stone-800 text-lg">CodeYoung</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-brand-700 font-semibold text-sm">{user?.name?.[0]}</span>
          </div>
          <span className="text-sm font-medium text-stone-700 hidden sm:block">{user?.name}</span>
          <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">Mentor</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-500"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function CapacityCard({ capacity }: { capacity: MentorCapacity }) {
  const pct = (capacity.booked / capacity.limit) * 100;
  const full = capacity.remaining === 0;

  return (
    <div className="card p-5">
      <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
        <Users className="w-4 h-4 text-brand-500" /> Today's capacity
      </h3>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-3xl font-bold text-stone-900">{capacity.booked}</span>
        <span className="text-stone-400 text-lg mb-0.5">/ {capacity.limit}</span>
      </div>
      <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${full ? 'bg-red-400' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-sm font-medium ${full ? 'text-red-600' : 'text-stone-600'}`}>
        {full ? 'No remaining capacity today' : `${capacity.remaining} class${capacity.remaining !== 1 ? 'es' : ''} remaining`}
      </p>
    </div>
  );
}

function BookingCard({ booking }: { booking: DashboardBooking }) {
  const navigate = useNavigate();
  const isUpcoming = new Date(booking.startUtc) > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card p-5 space-y-4 ${!isUpcoming ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          <div>
            <p className="font-semibold text-stone-800">{booking.mentor.localStart} — {booking.mentor.localEnd}</p>
            <p className="text-xs text-stone-500 flex items-center gap-1">
              <Globe className="w-3 h-3" />{booking.mentor.timezone}
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          isUpcoming ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
        }`}>
          {isUpcoming ? 'Upcoming' : 'Past'}
        </span>
      </div>

      <div className="border-t border-stone-100 pt-3 space-y-2">
        <div className="flex items-start gap-2">
          <User className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-stone-500 font-medium">Parent</p>
            <p className="font-medium text-stone-800 text-sm">{booking.parent.name}</p>
            <p className="text-xs text-stone-500">{booking.parent.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Globe className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-stone-500 font-medium">Parent sees</p>
            <p className="text-sm text-stone-700">{booking.parent.localStart} — {booking.parent.localEnd}</p>
            <p className="text-xs text-stone-400">{booking.parent.timezone}</p>
          </div>
        </div>

        {isUpcoming && (
          <div className="flex items-start gap-2">
            <Video className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
            <button
              onClick={() => navigate(`/class/${booking.bookingId}`)}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              <Video className="w-3.5 h-3.5" /> Join Trial Class
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function MentorDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [capacity, setCapacity] = useState<MentorCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getMentorBookings(), api.getMentorCapacity()])
      .then(([b, c]) => { setBookings(b.bookings); setCapacity(c); })
      .catch(() => setError('Could not load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter((b) => new Date(b.startUtc) > new Date());
  const past = bookings.filter((b) => new Date(b.startUtc) <= new Date());

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">
            Welcome, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-stone-500 mt-1">Your teaching dashboard.</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : error ? (
              <Alert variant="error">{error}</Alert>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <>
                    <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wide">Upcoming classes</h2>
                    {upcoming.map((b) => <BookingCard key={b.bookingId} booking={b} />)}
                  </>
                )}
                {past.length > 0 && (
                  <>
                    <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wide mt-4">Past classes</h2>
                    {past.slice(0, 5).map((b) => <BookingCard key={b.bookingId} booking={b} />)}
                  </>
                )}
                {bookings.length === 0 && (
                  <div className="card p-8 text-center">
                    <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <p className="font-semibold text-stone-700">No classes assigned yet</p>
                    <p className="text-stone-500 text-sm mt-1">Classes will appear here once parents book.</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-4">
            {capacity && <CapacityCard capacity={capacity} />}

            <div className="card p-5">
              <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-500" /> Your profile
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-stone-500 text-xs">Name</p>
                  <p className="font-medium text-stone-800">{user?.name}</p>
                </div>
                <div>
                  <p className="text-stone-500 text-xs">Email</p>
                  <p className="font-medium text-stone-800 break-all">{user?.email}</p>
                </div>
                <div>
                  <p className="text-stone-500 text-xs">Timezone</p>
                  <p className="font-medium text-stone-800">{user?.timezone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
