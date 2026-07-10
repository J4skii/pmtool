'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api-client';
import { useRegistrationStore } from '@/stores/registration-store';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { IndustryStep, type IndustryKey } from '@/components/onboarding/industry-step';
import { CompanyStep, type CompanyInput } from '@/components/onboarding/company-step';
import { InviteStep } from '@/components/onboarding/invite-step';

type WizardStep = 1 | 2 | 3;

const STEPS: Array<{ step: WizardStep; label: string }> = [
  { step: 1, label: 'Industry' },
  { step: 2, label: 'Company' },
  { step: 3, label: 'Invite' },
];

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  1: 'Pick your industry so FlowOS speaks your language.',
  2: 'Name your workspace and choose its URL.',
  3: 'Invite your teammates, or skip and do it later.',
};

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <nav aria-label="Onboarding progress" className="space-y-2">
      <ol className="flex items-center gap-2">
        {STEPS.map(({ step, label }) => {
          const state = step < current ? 'done' : step === current ? 'current' : 'upcoming';
          return (
            <li key={step} className="flex flex-1 items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  state === 'upcoming' ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground',
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  state === 'current' ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={current}
        aria-label={`Step ${current} of 3`}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${(current / 3) * 100}%` }} />
      </div>
    </nav>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const draft = useRegistrationStore((state) => state.draft);
  const clear = useRegistrationStore((state) => state.clear);

  const [step, setStep] = useState<WizardStep>(1);
  const [industry, setIndustry] = useState<IndustryKey | null>(null);
  const [company, setCompany] = useState<CompanyInput | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Guard: the wizard is useless without the personal details from /register.
  useEffect(() => {
    if (draft === null) router.replace('/register');
  }, [draft, router]);

  if (draft === null) return null;

  const submit = async (emails: string[]) => {
    if (industry === null || company === null) return;
    setSubmitting(true);
    try {
      await api.post(
        '/auth/register',
        {
          ...draft,
          tenantName: company.tenantName,
          tenantSlug: company.tenantSlug,
          industry,
          inviteEmails: emails,
        },
        { anonymous: true },
      );
      clear();
      toast.success('Workspace created. Sign in to get started.');
      router.replace('/login');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set up your workspace</CardTitle>
        <CardDescription>{STEP_DESCRIPTIONS[step]}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <StepIndicator current={step} />
        {step === 1 ? (
          <IndustryStep value={industry} onSelect={setIndustry} onContinue={() => setStep(2)} />
        ) : null}
        {step === 2 ? (
          <CompanyStep
            defaults={company ?? {}}
            onBack={() => setStep(1)}
            onNext={(values) => {
              setCompany(values);
              setStep(3);
            }}
          />
        ) : null}
        {step === 3 ? (
          <InviteStep
            emails={inviteEmails}
            onChange={setInviteEmails}
            onBack={() => setStep(2)}
            onFinish={(emails) => void submit(emails)}
            onSkip={() => void submit([])}
            submitting={submitting}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
