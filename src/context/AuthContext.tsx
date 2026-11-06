import React, { createContext, useContext, useState } from 'react';
import { setAuthToken, fetchApi } from '../api/client';

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
  token: string | null;
  login: (token: string, refreshToken: string, user: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = (accessToken: string, _refreshToken: string, userProfile: UserProfile) => {
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(userProfile);
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
