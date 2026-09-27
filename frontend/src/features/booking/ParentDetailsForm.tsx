import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Globe } from 'lucide-react';
import { TimezoneOption } from '@codeyoung/shared';

const schema = z.object({
  parentName: z.string().min(2, 'Name must be at least 2 characters'),
  parentEmail: z.string().email('Please enter a valid email'),
  parentPhone: z.string().regex(/^\+?[\d\s\-().]{7,20}$/, 'Please enter a valid phone number'),
  parentTimezone: z.string().min(1, 'Please select your timezone'),
});

export type ParentDetailsFormData = z.infer<typeof schema>;

interface ParentDetailsFormProps {
  defaultValues?: Partial<ParentDetailsFormData>;
  timezones: TimezoneOption[];
  onSubmit: (data: ParentDetailsFormData) => void;
}

export function ParentDetailsForm({
  defaultValues,
  timezones,
  onSubmit,
}: ParentDetailsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParentDetailsFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      parentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...defaultValues,
    },
  });

  return (
    <motion.form
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      <div>
        <label htmlFor="parentName" className="label">
          <User className="inline w-4 h-4 mr-1.5 text-stone-400" aria-hidden="true" />
          Parent / Guardian Name
        </label>
        <input
          id="parentName"
          type="text"
          autoComplete="name"
          placeholder="Jane Doe"
          className="input-field"
          aria-invalid={!!errors.parentName}
          aria-describedby={errors.parentName ? 'name-error' : undefined}
          {...register('parentName')}
        />
        {errors.parentName && (
          <p id="name-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {errors.parentName.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="parentEmail" className="label">
          <Mail className="inline w-4 h-4 mr-1.5 text-stone-400" aria-hidden="true" />
          Email Address
        </label>
        <input
          id="parentEmail"
          type="email"
          autoComplete="email"
          placeholder="jane@example.com"
          className="input-field"
          aria-invalid={!!errors.parentEmail}
          aria-describedby={errors.parentEmail ? 'email-error' : undefined}
          {...register('parentEmail')}
        />
        {errors.parentEmail && (
          <p id="email-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {errors.parentEmail.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="parentPhone" className="label">
          <Phone className="inline w-4 h-4 mr-1.5 text-stone-400" aria-hidden="true" />
          Phone Number
        </label>
        <input
          id="parentPhone"
          type="tel"
          autoComplete="tel"
          placeholder="+1 555 000 0000"
          className="input-field"
          aria-invalid={!!errors.parentPhone}
          aria-describedby={errors.parentPhone ? 'phone-error' : undefined}
          {...register('parentPhone')}
        />
        {errors.parentPhone && (
          <p id="phone-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {errors.parentPhone.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="parentTimezone" className="label">
          <Globe className="inline w-4 h-4 mr-1.5 text-stone-400" aria-hidden="true" />
          Your Timezone
        </label>
        <select
          id="parentTimezone"
          className="input-field"
          aria-invalid={!!errors.parentTimezone}
          aria-describedby={errors.parentTimezone ? 'tz-error' : undefined}
          {...register('parentTimezone')}
        >
          <option value="">Select your timezone…</option>
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label} ({tz.offset})
            </option>
          ))}
        </select>
        {errors.parentTimezone && (
          <p id="tz-error" className="mt-1.5 text-sm text-red-600" role="alert">
            {errors.parentTimezone.message}
          </p>
        )}
      </div>

      <button type="submit" className="btn-primary w-full mt-2">
        Continue to Choose Time →
      </button>
    </motion.form>
  );
}
