'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthUser, Tenant } from '@/lib/types';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  tenant: Tenant | null;
  hydrated: boolean;
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  setUser: (user: AuthUser) => void;
  setTenant: (tenant: Tenant) => void;
  logout: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      tenant: null,
      hydrated: false,
      setSession: ({ accessToken, refreshToken, user }) => set({ accessToken, refreshToken, user }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      setTenant: (tenant) => set({ tenant }),
      logout: () => set({ accessToken: null, refreshToken: null, user: null, tenant: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'flowos-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ accessToken, refreshToken, user, tenant }) => ({
        accessToken,
        refreshToken,
        user,
        tenant,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
