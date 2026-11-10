import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AuthTokens, fetchApi, session } from '../api/client';

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isVerified: boolean;
  login: (tokens: AuthTokens, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isVerified: false,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the persisted session on app launch.
  useEffect(() => {
    session.onExpired(() => setUser(null));
    (async () => {
      try {
        if (await session.restore()) {
          const res = await fetchApi<UserProfile>('/users/me');
          if (res.success && res.data) setUser(res.data);
          else if (res.error?.code !== 'NETWORK_ERROR') await session.clear();
        }
      } finally {
        setIsLoading(false);
      }
    })();
    return () => session.onExpired(null);
  }, []);

  const login = useCallback(async (tokens: AuthTokens, profile: UserProfile) => {
    await session.save(tokens);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session.refreshToken;
    if (refreshToken) {
      fetchApi('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => {});
    }
    await session.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isVerified: user?.status === 'ACTIVE', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
