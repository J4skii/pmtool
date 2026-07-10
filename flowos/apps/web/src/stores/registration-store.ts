'use client';

import { create } from 'zustand';

/** Personal details captured on /register, consumed by the /onboarding wizard. */
export interface RegistrationDraft {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface RegistrationState {
  draft: RegistrationDraft | null;
  setDraft: (draft: RegistrationDraft) => void;
  clear: () => void;
}

/**
 * Intentionally NOT persisted: holds a plaintext password only for the
 * few seconds between the register form and the onboarding submit.
 */
export const useRegistrationStore = create<RegistrationState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  clear: () => set({ draft: null }),
}));
