import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { TimezoneOption } from '@codeyoung/shared';
import { api } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Alert } from '@/components/ui/Alert';
import { Skeleton } from '@/components/ui/Skeleton';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().max(20).optional(),
  timezone: z.string().min(1, 'Please select a timezone'),
});
type FormData = z.infer<typeof schema>;

export function ParentProfilePage() {
  const { user, refresh } = useAuth();
  const [timezones, setTimezones] = useState<TimezoneOption[]>([]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    api.getTimezones().then((r) => setTimezones(r.timezones)).catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      api.getParentProfile().then((p) => {
        reset({ name: p.name, phone: p.phone ?? '', timezone: p.timezone });
      }).catch(console.error);
    }
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    setSaveError(null);
    try {
      await api.updateParentProfile(data);
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError('Could not save profile. Please try again.');
    }
  };

  if (!user) return <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center"><Skeleton className="w-64 h-32" /></div>;

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <header className="bg-white border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link to="/parent" className="p-2 rounded-lg hover:bg-stone-100 transition-colors" aria-label="Back to dashboard">
            <ArrowLeft className="w-5 h-5 text-stone-600" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">CY</span>
            </div>
            <span className="font-bold text-stone-800">Your Profile</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {saved && <Alert variant="success" className="mb-4">Profile saved successfully.</Alert>}
          {saveError && <Alert variant="error" className="mb-4">{saveError}</Alert>}

          <div className="card p-6 sm:p-8">
            <h2 className="text-xl font-bold text-stone-900 mb-6">Edit Profile</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label htmlFor="name" className="label">Full Name</label>
                <input id="name" type="text" className="input-field" {...register('name')} />
                {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label htmlFor="email" className="label">Email</label>
                <input id="email" type="email" className="input-field bg-stone-50" value={user.email} disabled />
                <p className="mt-1 text-xs text-stone-400">Email is managed by Google and cannot be changed here.</p>
              </div>

              <div>
                <label htmlFor="phone" className="label">Phone Number</label>
                <input id="phone" type="tel" className="input-field" placeholder="+1 555 000 0000" {...register('phone')} />
              </div>

              <div>
                <label htmlFor="timezone" className="label">Timezone</label>
                <select id="timezone" className="input-field" {...register('timezone')}>
                  <option value="">Select timezone…</option>
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label} ({tz.offset})</option>
                  ))}
                </select>
                {errors.timezone && <p className="mt-1.5 text-sm text-red-600">{errors.timezone.message}</p>}
              </div>

              <button type="submit" disabled={isSubmitting || !isDirty} className="btn-primary w-full">
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
