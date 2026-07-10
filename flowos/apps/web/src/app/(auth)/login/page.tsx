'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { loginSchema, type LoginInput } from '@flowos/shared';
import { api, ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginResponse } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label, FieldError } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [needsTotp, setNeedsTotp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const data = await api.post<LoginResponse>('/auth/login', values, { anonymous: true });
      setSession(data);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.code === 'AUTH_2FA_REQUIRED') {
        setNeedsTotp(true);
        toast.info('Enter your two-factor authentication code.');
        return;
      }
      toast.error(error instanceof ApiError ? error.message : 'Login failed');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" className="mt-1" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" className="mt-1" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </div>
          {needsTotp ? (
            <div>
              <Label htmlFor="totpCode">Two-factor code</Label>
              <Input id="totpCode" inputMode="numeric" maxLength={6} placeholder="123456" className="mt-1" {...register('totpCode')} />
              <FieldError message={errors.totpCode?.message} />
            </div>
          ) : null}
          <Button type="submit" className="w-full" loading={isSubmitting}>
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account yet?{' '}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create a workspace
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
