'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FieldError } from '@/components/ui/label';

const emailSchema = z.string().email('Enter a valid email address');

interface InviteStepProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  onBack: () => void;
  /** Submit registration with the collected invite emails. */
  onFinish: (emails: string[]) => void;
  /** Submit registration without inviting anyone. */
  onSkip: () => void;
  submitting: boolean;
}

export function InviteStep({ emails, onChange, onBack, onFinish, onSkip, submitting }: InviteStepProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const tryAdd = (raw: string): boolean => {
    const value = raw.trim();
    if (!value) return true;
    const parsed = emailSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email address');
      return false;
    }
    if (emails.includes(parsed.data)) {
      setError('That email has already been added');
      return false;
    }
    onChange([...emails, parsed.data]);
    setInput('');
    setError(undefined);
    return true;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      tryAdd(input);
    }
  };

  const removeEmail = (email: string) => {
    onChange(emails.filter((item) => item !== email));
  };

  const handleFinish = () => {
    // Fold any pending input into the chip list before submitting.
    if (input.trim() !== '') {
      const added = tryAdd(input);
      if (!added) return;
      onFinish([...emails, input.trim()]);
      return;
    }
    onFinish(emails);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="inviteEmail">Invite teammates by email</Label>
        <Input
          id="inviteEmail"
          type="email"
          placeholder="teammate@company.com"
          className="mt-1"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setError(undefined);
          }}
          onKeyDown={handleKeyDown}
        />
        <p className="mt-1 text-xs text-muted-foreground">Press Enter or comma to add each email.</p>
        <FieldError message={error} />
      </div>

      {emails.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Invited teammates">
          {emails.map((email) => (
            <li
              key={email}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm"
            >
              <span>{email}</span>
              <button
                type="button"
                aria-label={`Remove ${email}`}
                onClick={() => removeEmail(email)}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No teammates added yet — you can always invite people later.</p>
      )}

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onSkip} disabled={submitting}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleFinish} loading={submitting}>
            Finish setup
          </Button>
        </div>
      </div>
    </div>
  );
}
