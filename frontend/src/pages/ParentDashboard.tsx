import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Globe, Video, ArrowRight, LogOut, User, BookOpen } from 'lucide-react';
import { DashboardBooking } from '@codeyoung/shared';
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

        <div className="flex items-center gap-3">
          {user?.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-brand-700 font-semibold text-sm">{user?.name?.[0]}</span>
            </div>
          )}
          <span className="text-sm font-medium text-stone-700 hidden sm:block">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors text-stone-500 hover:text-stone-700"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

function classStatus(booking: DashboardBooking) {
  const now = Date.now();
  const start = new Date(booking.startUtc).getTime();
  const end = new Date(booking.endUtc).getTime();
  if (now >= end) return 'ended';
  if (now >= start) return 'live';
  if (now >= start - 10 * 60 * 1000) return 'joinable';
  return 'upcoming';
}

function JoinButton({ booking }: { booking: DashboardBooking }) {
  const navigate = useNavigate();
  const status = classStatus(booking);
  if (status === 'ended') {
    return <span className="text-xs font-medium text-stone-400 bg-stone-100 px-3 py-1.5 rounded-lg">Completed</span>;
  }
  if (status === 'live' || status === 'joinable') {
    return (
      <button onClick={() => navigate(`/class/${booking.bookingId}`)} className="btn-primary text-sm py-2 px-4">
        <Video className="w-4 h-4" /> Join Trial Class
      </button>
    );
  }
  return (
    <button onClick={() => navigate(`/class/${booking.bookingId}`)} className="btn-secondary text-sm py-2 px-4">
      View Class
    </button>
  );
}

function UpcomingBookingCard({ booking }: { booking: DashboardBooking }) {
  const isUpcoming = new Date(booking.startUtc) > new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-800">
          {isUpcoming ? 'Upcoming trial class' : 'Recent class'}
        </h3>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          booking.status === 'CONFIRMED'
            ? 'bg-green-100 text-green-700'
            : 'bg-stone-100 text-stone-500'
        }`}>
          {booking.status}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Your class</p>
            <p className="font-semibold text-stone-800">{booking.parent.localDate}</p>
            <p className="text-stone-600">{booking.parent.localStart} — {booking.parent.localEnd}</p>
            <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3" />{booking.parent.timezone}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Mentor</p>
            <p className="font-semibold text-stone-800">{booking.mentor.name}</p>
            <p className="text-stone-600 text-sm">{booking.mentor.localStart} — {booking.mentor.localEnd}</p>
            <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3" />{booking.mentor.timezone}
            </p>
          </div>
        </div>

        <div className="pt-1">
          <JoinButton booking={booking} />
        </div>
      </div>
    </motion.div>
  );
}

export function ParentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getParentBookings()
      .then((r) => setBookings(r.bookings))
      .catch(() => setError('Could not load your bookings.'))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter((b) => new Date(b.startUtc) > new Date() && b.status === 'CONFIRMED');
  const past = bookings.filter((b) => new Date(b.startUtc) <= new Date() || b.status !== 'CONFIRMED');

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <NavBar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-stone-500 mt-1">Manage your trial coding classes.</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wide">Upcoming</h2>

            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            ) : error ? (
              <Alert variant="error">{error}</Alert>
            ) : upcoming.length > 0 ? (
              upcoming.map((b) => <UpcomingBookingCard key={b.bookingId} booking={b} />)
            ) : (
              <div className="card p-8 text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-brand-500" />
                </div>
                <p className="font-semibold text-stone-800 mb-1">No upcoming classes</p>
                <p className="text-stone-500 text-sm mb-4">Book a trial class to get started.</p>
                <button onClick={() => navigate('/parent/book')} className="btn-primary">
                  Book a Trial Class <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Past bookings */}
            {past.length > 0 && (
              <>
                <h2 className="font-semibold text-stone-700 text-sm uppercase tracking-wide mt-6">Past</h2>
                {past.slice(0, 3).map((b) => (
                  <div key={b.bookingId} className="card p-4 flex items-center justify-between opacity-60">
                    <div>
                      <p className="font-medium text-stone-700 text-sm">{b.parent.localDate}</p>
                      <p className="text-stone-500 text-xs">{b.parent.localStart} · {b.mentor.name}</p>
                    </div>
                    <span className="text-xs text-stone-400 font-medium">{b.status}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-brand-500" /> Your account
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
              <Link to="/parent/profile" className="btn-secondary w-full mt-4 text-sm py-2">
                Edit Profile
              </Link>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-500" /> Quick actions
              </h3>
              <div className="space-y-2">
                <button onClick={() => navigate('/parent/book')} className="btn-primary w-full text-sm py-2.5">
                  Book a Trial Class
                </button>
                <Link to="/parent/bookings" className="btn-secondary w-full text-sm py-2.5 text-center block">
                  View All Bookings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
