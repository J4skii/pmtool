'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerSchema } from '@flowos/shared';
import { useRegistrationStore } from '@/stores/registration-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FieldError } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const accountSchema = registerSchema.pick({
  email: true,
  password: true,
  firstName: true,
  lastName: true,
});
type AccountInput = z.infer<typeof accountSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setDraft = useRegistrationStore((state) => state.setDraft);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountInput>({ resolver: zodResolver(accountSchema) });

  const onSubmit = handleSubmit((values) => {
    setDraft(values);
    router.push('/onboarding');
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Step 1 of 2 — tell us about yourself, then set up your workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" autoComplete="given-name" className="mt-1" {...register('firstName')} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" autoComplete="family-name" className="mt-1" {...register('lastName')} />
              <FieldError message={errors.lastName?.message} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" autoComplete="email" className="mt-1" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" className="mt-1" {...register('password')} />
            <p className="mt-1 text-xs text-muted-foreground">
              At least 10 characters with an uppercase letter, a lowercase letter and a digit.
            </p>
            <FieldError message={errors.password?.message} />
          </div>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Continue
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
