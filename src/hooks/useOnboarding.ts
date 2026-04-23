import { useMemo, useState } from 'react';

export type OnboardingPath = 'guest' | 'account';

export function useOnboarding(initialStep = 0) {
  const [step, setStep] = useState(initialStep);
  const [path, setPath] = useState<OnboardingPath>('guest');
  const totalSteps = 4;

  const progress = useMemo(() => ((step + 1) / totalSteps) * 100, [step, totalSteps]);

  return {
    path,
    setPath,
    step,
    setStep,
    totalSteps,
    progress,
    next: () => setStep((current) => Math.min(current + 1, totalSteps - 1)),
    back: () => setStep((current) => Math.max(current - 1, 0)),
  };
}
