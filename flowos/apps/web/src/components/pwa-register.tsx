'use client';

import { useEffect } from 'react';

/** Registers the service worker in production browsers. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failure is non-fatal (e.g. unsupported browser).
    });
  }, []);

  return null;
}
