import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Globe, ArrowRight, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { CYLogo } from '@/components/ui/CYLogo';

// ── Floating hero card ────────────────────────────────────────────────────────

function FloatingCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      animate={reduced ? {} : { y: [0, -10, 0] }}
      transition={{ duration: 5, repeat: Infinity, delay, ease: 'easeInOut' }}
      className={`bg-white rounded-2xl shadow-card-lg border border-stone-100 p-4 ${className ?? ''}`}
    >
      {children}
    </motion.div>
  );
}

function HeroScene() {
  return (
    <div className="relative w-full max-w-sm mx-auto h-80 lg:h-96" aria-hidden="true">
      {/* Central calendar card */}
      <FloatingCard className="absolute top-8 left-1/2 -translate-x-1/2 w-48" delay={0}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-stone-500">Trial Class</p>
            <p className="text-sm font-bold text-stone-800">Sep 28</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {['9:00', '10:30', '2:00', '3:30', '5:00', '6:30'].map((t, i) => (
            <div
              key={t}
              className={`text-xs py-1 px-1.5 rounded-md text-center font-medium ${
                i === 1
                  ? 'bg-brand-500 text-white'
                  : 'bg-stone-100 text-stone-500'
              }`}
            >
              {t}
            </div>
          ))}
        </div>
      </FloatingCard>

      {/* Mentor card */}
      <FloatingCard className="absolute bottom-12 left-0 w-40" delay={1.5}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            A
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-800">Aarav</p>
            <p className="text-xs text-stone-500">Mentor</p>
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <span className="text-xs text-green-600">Available</span>
            </div>
          </div>
        </div>
      </FloatingCard>

      {/* Timezone card */}
      <FloatingCard className="absolute bottom-12 right-0 w-40" delay={2.5}>
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-brand-500" />
          <p className="text-xs font-semibold text-stone-700">Timezones</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">New York</span>
            <span className="font-medium text-stone-700">10:30 AM</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">London</span>
            <span className="font-medium text-stone-700">3:30 PM</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-stone-500">Bengaluru</span>
            <span className="font-medium text-stone-700">9:00 PM</span>
          </div>
        </div>
      </FloatingCard>

      {/* Confirmation badge */}
      <FloatingCard className="absolute top-4 right-0 w-36" delay={3}>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-stone-800">Booked!</p>
            <p className="text-xs text-stone-500">Class confirmed</p>
          </div>
        </div>
      </FloatingCard>

      {/* Clock */}
      <FloatingCard className="absolute top-4 left-0 w-28" delay={0.8}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" />
          <div>
            <p className="text-xs text-stone-500">Duration</p>
            <p className="text-sm font-bold text-stone-800">30 min</p>
          </div>
        </div>
      </FloatingCard>
    </div>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Share your details',
    desc: 'Tell us your name, email, and timezone.',
  },
  {
    step: '02',
    title: 'Pick a time',
    desc: 'Browse available slots shown in your local time.',
  },
  {
    step: '03',
    title: 'We match a mentor',
    desc: 'Our system instantly assigns the best available mentor.',
  },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleBookCTA = () => {
    if (!user) return navigate('/login');
    if (user.role === 'MENTOR') return navigate('/mentor');
    navigate('/parent/book');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CYLogo className="w-8 h-8" />
            <span className="font-bold text-stone-800 text-lg">CodeYoung</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  to={user.role === 'MENTOR' ? '/mentor' : '/parent'}
                  className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Sign out">
                  <LogOut className="w-4 h-4 text-stone-500" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">Sign in</Link>
                <button onClick={handleBookCTA} className="btn-primary text-sm py-2 px-4">Book a Trial Class</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm font-medium px-3 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
              Free trial class — no commitment
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 leading-tight tracking-tight">
              Find a time
              <br />
              <span className="text-brand-500">that works.</span>
              <br />
              We'll find the
              <br />
              mentor.
            </h1>

            <p className="mt-6 text-lg text-stone-600 leading-relaxed max-w-md">
              Choose a convenient time in your timezone and we'll match your child with an
              available mentor for a personalized trial coding class.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBookCTA}
                className="btn-primary text-base py-3.5 px-8"
              >
                Book a Trial Class
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#how-it-works"
                className="btn-secondary text-base py-3.5 px-8"
              >
                How it works
              </a>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-stone-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Free 30-min class
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Expert mentors
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Any timezone
              </div>
            </div>
          </motion.div>

          {/* 3D-inspired floating scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <HeroScene />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="bg-white border-y border-stone-100 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-stone-900">How it works</h2>
            <p className="mt-3 text-stone-500">Three simple steps to your first class.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-brand-600 font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="font-semibold text-stone-800 mb-2">{item.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={handleBookCTA}
              className="btn-primary text-base py-3.5 px-8"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-stone-400">
        <p>© {new Date().getFullYear()} CodeYoung. Demo application.</p>
        <p className="mt-1">
          <Link to="/mentor/login" className="hover:text-stone-600 transition-colors">Mentor login</Link>
        </p>
      </footer>
    </div>
  );
}
