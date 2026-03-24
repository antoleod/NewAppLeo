import { useMemo, useState } from 'react';

export type OnboardingPath = 'guest' | 'pin' | 'account';

export function useOnboarding(initialStep = 0) {
  const [step, setStep] = useState(initialStep);
  const [path, setPath] = useState<OnboardingPath>('guest');
  const totalSteps = path === 'guest' ? 4 : 5;

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
