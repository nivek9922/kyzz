'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { gaSetUserId } from '@/lib/gtag';

/**
 * Asocia el user_id de GA4 a la sesión activa (para audiencias y cross-device).
 * Se monta dentro del SessionProvider y no renderiza nada.
 */
export const AnalyticsUser = () => {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    gaSetUserId(session?.user?.id ?? null);
  }, [status, session?.user?.id]);

  return null;
};
