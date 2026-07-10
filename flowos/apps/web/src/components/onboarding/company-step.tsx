'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@flowos/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FieldError } from '@/components/ui/label';

const companySchema = registerSchema.pick({ tenantName: true, tenantSlug: true });
export type CompanyInput = z.infer<typeof companySchema>;

/** Derive a URL-safe slug suggestion from a workspace name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface CompanyStepProps {
  defaults: Partial<CompanyInput>;
  onBack: () => void;
  onNext: (values: CompanyInput) => void;
}

export function CompanyStep({ defaults, onBack, onNext }: CompanyStepProps) {
  const slugEditedRef = useRef(Boolean(defaults.tenantSlug));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: { tenantName: defaults.tenantName ?? '', tenantSlug: defaults.tenantSlug ?? '' },
  });

  const tenantName = watch('tenantName');

  useEffect(() => {
    if (!slugEditedRef.current) {
      setValue('tenantSlug', slugify(tenantName ?? ''), { shouldValidate: false });
    }
  }, [tenantName, setValue]);

  const onSubmit = handleSubmit((values) => onNext(values));

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="tenantName">Company name</Label>
        <Input id="tenantName" autoComplete="organization" className="mt-1" {...register('tenantName')} />
        <FieldError message={errors.tenantName?.message} />
      </div>
      <div>
        <Label htmlFor="tenantSlug">Workspace URL</Label>
        <Input
          id="tenantSlug"
          className="mt-1"
          {...register('tenantSlug', {
            onChange: () => {
              slugEditedRef.current = true;
            },
          })}
        />
        <p className="mt-1 text-xs text-muted-foreground">Lowercase letters, digits and hyphens only.</p>
        <FieldError message={errors.tenantSlug?.message} />
      </div>
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}
