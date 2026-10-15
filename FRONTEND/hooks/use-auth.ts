'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/api';
import type { User } from '@/types';

export function useAuth() {
  const router  = useRouter();
  const [user, setUser]           = useState<User | null>(null);
  const [loading, setLoading]     = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = authService.getToken();
    const storedUser = authService.getCurrentUser() as User | null;

    const isDemoToken = token === 'demo-token-local' || token === 'demo-session';
    const isJwt       = !!token && token.split('.').length === 3;

    if (!token || (!isDemoToken && !isJwt)) {
      setAuthenticated(false);
      setUser(null);
      setLoading(false);
      router.replace('/login');
      return;
    }

    const resolvedUser: User = storedUser ?? {
      id: 'demo-user',
      name: 'Administrador Demo',
      email: 'admin@admin.com',
      role: 'ADMIN',
    };

    setUser(resolvedUser);
    setAuthenticated(true);
    setLoading(false);
  }, [router]);

  const logout = () => {
    authService.logout();
    setAuthenticated(false);
    setUser(null);
    router.replace('/login');
  };

  return { user, loading, authenticated, logout };
}
