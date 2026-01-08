'use client';

import { Check, LucideIcon } from 'lucide-react';

interface Step {
  number: number;
  title: string;
  icon: LucideIcon;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  canProceedToStep2: boolean;
  canProceedToStep3: boolean;
  onStepClick: (stepNumber: number) => void;
}

export default function StepIndicator({
  steps,
  currentStep,
  canProceedToStep2,
  canProceedToStep3,
  onStepClick,
}: StepIndicatorProps) {
  const canNavigateToStep = (stepNumber: number) => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return canProceedToStep2;
    if (stepNumber === 3) return canProceedToStep3;
    return false;
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-slate-700 -z-10" />
        <div
          className="absolute top-6 left-0 h-0.5 bg-teal-600 dark:bg-teal-500 transition-all duration-300 -z-10"
          style={{
            width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const canNavigate = canNavigateToStep(step.number);

          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              <button
                onClick={() => canNavigate && onStepClick(step.number)}
                disabled={!canNavigate}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                  isCompleted
                    ? 'bg-teal-600 dark:bg-teal-500 text-white'
                    : isCurrent
                      ? 'bg-teal-600 dark:bg-teal-500 text-white ring-4 ring-teal-600/20 dark:ring-teal-500/20'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                } ${
                  canNavigate ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed opacity-50'
                }`}
              >
                {isCompleted ? <Check className="h-6 w-6" /> : <StepIcon className="h-6 w-6" />}
              </button>
              <span
                className={`text-sm mt-2 font-medium ${
                  isCurrent ? 'text-teal-600 dark:text-teal-400' : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

