import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Your Details' },
  { number: 2, label: 'Choose Time' },
  { number: 3, label: 'Confirm' },
];

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Booking progress" className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const isCompleted = step.number < currentStep;
        const isActive = step.number === currentStep;

        return (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                  isCompleted && 'bg-brand-500 text-white',
                  isActive && 'bg-brand-500 text-white ring-4 ring-brand-100',
                  !isCompleted && !isActive && 'bg-stone-100 text-stone-400'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : step.number}
              </div>
              <span
                className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-brand-600' : 'text-stone-400'
                )}
              >
                {step.label}
              </span>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-16 sm:w-24 h-0.5 mx-2 mb-5 transition-all duration-300',
                  step.number < currentStep ? 'bg-brand-500' : 'bg-stone-200'
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
