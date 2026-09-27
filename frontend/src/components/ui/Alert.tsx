import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

interface AlertProps {
  variant: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant, title, children, className }: AlertProps) {
  const Icon = icons[variant];
  return (
    <div className={cn('flex gap-3 p-4 rounded-xl border', styles[variant], className)}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}
