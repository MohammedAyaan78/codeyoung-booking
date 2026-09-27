import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { Alert } from '@/components/ui/Alert';

// ── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-stone-200" />
      <span className="text-xs text-stone-400 font-medium">or</span>
      <div className="flex-1 h-px bg-stone-200" />
    </div>
  );
}

// ── Parent section (Google + email/password) ──────────────────────────────────

type ParentMode = 'signin' | 'register';

const parentSignInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const parentRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignInData = z.infer<typeof parentSignInSchema>;
type RegisterData = z.infer<typeof parentRegisterSchema>;

function ParentLogin() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<ParentMode>('signin');
  const [error, setError] = useState<string | null>(searchParams.get('error') ? 'Google sign-in failed. Please try again.' : null);
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const signInForm = useForm<SignInData>({ resolver: zodResolver(parentSignInSchema) });
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(parentRegisterSchema) });

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const onSignIn = async (data: SignInData) => {
    setError(null);
    try {
      await api.parentLogin(data);
      await refresh();
      navigate('/parent');
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setError(e?.error?.message ?? 'Invalid email or password.');
    }
  };

  const onRegister = async (data: RegisterData) => {
    setError(null);
    try {
      await api.parentRegister(data);
      await refresh();
      navigate('/parent');
    } catch (err: unknown) {
      const e = err as { error?: { message?: string; code?: string } };
      setError(e?.error?.message ?? 'Could not create account. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Error shown at top so it's visible above Google button */}
      {error && (
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </Alert>
      )}

      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border-2 border-stone-200 rounded-xl font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all duration-200 active:scale-[0.98]"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <Divider />

      {/* Mode toggle */}
      <div className="flex bg-stone-100 rounded-xl p-1">
        <button
          onClick={() => { setMode('signin'); setError(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            mode === 'signin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Sign In
        </button>
        <button
          onClick={() => { setMode('register'); setError(null); }}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
            mode === 'register' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          Create Account
        </button>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'signin' ? (
          <motion.form
            key="signin"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={signInForm.handleSubmit(onSignIn)}
            className="space-y-4"
            noValidate
          >
            <div>
              <label htmlFor="parent-signin-email" className="label">
                <Mail className="inline w-4 h-4 mr-1.5 text-stone-400" />Email
              </label>
              <input
                id="parent-signin-email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                className="input-field"
                {...signInForm.register('email')}
              />
              {signInForm.formState.errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{signInForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="parent-signin-password" className="label">
                <Lock className="inline w-4 h-4 mr-1.5 text-stone-400" />Password
              </label>
              <input
                id="parent-signin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-field"
                {...signInForm.register('password')}
              />
              {signInForm.formState.errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{signInForm.formState.errors.password.message}</p>
              )}
            </div>
            <button type="submit" disabled={signInForm.formState.isSubmitting} className="btn-primary w-full">
              {signInForm.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="register"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            onSubmit={registerForm.handleSubmit(onRegister)}
            className="space-y-4"
            noValidate
          >
            <div>
              <label htmlFor="parent-reg-name" className="label">
                <User className="inline w-4 h-4 mr-1.5 text-stone-400" />Full Name
              </label>
              <input
                id="parent-reg-name"
                type="text"
                autoComplete="name"
                placeholder="Jane Doe"
                className="input-field"
                {...registerForm.register('name')}
              />
              {registerForm.formState.errors.name && (
                <p className="mt-1.5 text-sm text-red-600">{registerForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="parent-reg-email" className="label">
                <Mail className="inline w-4 h-4 mr-1.5 text-stone-400" />Email
              </label>
              <input
                id="parent-reg-email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                className="input-field"
                {...registerForm.register('email')}
              />
              {registerForm.formState.errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="parent-reg-password" className="label">
                <Lock className="inline w-4 h-4 mr-1.5 text-stone-400" />Password
              </label>
              <input
                id="parent-reg-password"
                type="password"
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="input-field"
                {...registerForm.register('password')}
              />
              {registerForm.formState.errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
              )}
            </div>
            <button type="submit" disabled={registerForm.formState.isSubmitting} className="btn-primary w-full">
              {registerForm.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : 'Create Account'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Mentor login ──────────────────────────────────────────────────────────────

const mentorSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type MentorFormData = z.infer<typeof mentorSchema>;

function MentorLogin() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<MentorFormData>({
    resolver: zodResolver(mentorSchema),
  });

  const onSubmit = async (data: MentorFormData) => {
    setLoginError(null);
    try {
      await api.mentorLogin(data);
      await refresh();
      navigate('/mentor');
    } catch (err: unknown) {
      const e = err as { error?: { message?: string } };
      setLoginError(e?.error?.message ?? 'Invalid credentials.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {loginError && (
        <Alert variant="error">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {loginError}
          </div>
        </Alert>
      )}

      <div>
        <label htmlFor="mentor-email" className="label">
          <Mail className="inline w-4 h-4 mr-1.5 text-stone-400" />Email
        </label>
        <input
          id="mentor-email"
          type="email"
          autoComplete="email"
          placeholder="aarav.sharma@codeyoung.demo"
          className="input-field"
          {...register('email')}
        />
        {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="mentor-password" className="label">
          <Lock className="inline w-4 h-4 mr-1.5 text-stone-400" />Password
        </label>
        <input
          id="mentor-password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          className="input-field"
          {...register('password')}
        />
        {errors.password && <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Signing in…
          </span>
        ) : 'Sign In'}
      </button>

      <p className="text-xs text-stone-400 text-center">
        Demo password: <span className="font-mono font-medium text-stone-600">CodeYoungDemo123!</span>
      </p>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type LoginTab = 'parent' | 'mentor';

interface LoginPageProps {
  defaultTab?: LoginTab;
}

export function LoginPage({ defaultTab = 'parent' }: LoginPageProps) {
  const [tab, setTab] = useState<LoginTab>(defaultTab);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(user.role === 'MENTOR' ? '/mentor' : '/parent', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-[#faf9f7] flex flex-col">
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

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-stone-900">Welcome to CodeYoung</h1>
            <p className="text-stone-500 mt-1 text-sm">Sign in or create your account</p>
            <p className="mt-3 text-sm">
              <span className="text-stone-400">No account needed? </span>
              <Link to="/book" className="text-brand-600 font-medium hover:underline">
                Book directly without login →
              </Link>
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-stone-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setTab('parent')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'parent'
                  ? 'bg-white text-stone-900 shadow-card'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Parent / Guardian
            </button>
            <button
              onClick={() => setTab('mentor')}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                tab === 'mentor'
                  ? 'bg-white text-stone-900 shadow-card'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Mentor
            </button>
          </div>

          <div className="card p-6 sm:p-8">
            {tab === 'parent' ? (
              <>
                <h2 className="font-semibold text-stone-800 mb-1">Parent / Guardian</h2>
                <p className="text-stone-500 text-sm mb-6">
                  Sign in to book and manage your child's trial coding class.
                </p>
                <ParentLogin />
              </>
            ) : (
              <>
                <h2 className="font-semibold text-stone-800 mb-1">Mentor login</h2>
                <p className="text-stone-500 text-sm mb-6">
                  Access your teaching dashboard and view assigned classes.
                </p>
                <MentorLogin />
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
