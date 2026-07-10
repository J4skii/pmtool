'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resolveTerm, type TerminologyKey, type TerminologyMap } from '@flowos/shared';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { Tenant } from '@/lib/types';

interface TerminologyContextValue {
  t: (key: TerminologyKey) => string;
  overrides: TerminologyMap;
  tenant: Tenant | null;
  isLoading: boolean;
}

const TerminologyContext = createContext<TerminologyContextValue>({
  t: (key) => resolveTerm(key),
  overrides: {},
  tenant: null,
  isLoading: false,
});

export function TerminologyProvider({ children }: { children: ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setTenant = useAuthStore((state) => state.setTenant);
  const cachedTenant = useAuthStore((state) => state.tenant);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', 'current'],
    queryFn: async () => {
      const result = await api.get<Tenant>('/tenants/current');
      setTenant(result);
      return result;
    },
    enabled: Boolean(accessToken),
    staleTime: 5 * 60_000,
    placeholderData: cachedTenant ?? undefined,
  });

  const overrides = useMemo<TerminologyMap>(
    () => tenant?.branding?.terminology ?? cachedTenant?.branding?.terminology ?? {},
    [tenant, cachedTenant],
  );

  const t = useCallback((key: TerminologyKey) => resolveTerm(key, overrides), [overrides]);

  const value = useMemo(
    () => ({ t, overrides, tenant: tenant ?? cachedTenant, isLoading }),
    [t, overrides, tenant, cachedTenant, isLoading],
  );

  return <TerminologyContext.Provider value={value}>{children}</TerminologyContext.Provider>;
}

export function useTerminology(): TerminologyContextValue {
  return useContext(TerminologyContext);
}
