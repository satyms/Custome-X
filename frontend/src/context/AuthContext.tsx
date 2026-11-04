import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../api';
import type { User, UserLoginRequest, UserRegisterRequest } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: UserLoginRequest) => Promise<void>;
  register: (payload: UserRegisterRequest) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'cx_token';
const REFRESH_TOKEN_KEY = 'cx_refresh_token';
const USER_KEY = 'cx_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate active session on initial mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const verifiedUser = await authApi.getMe();
        setUser(verifiedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(verifiedUser));
      } catch (error) {
        console.warn('Session verification failed, resetting auth state:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: UserLoginRequest) => {
    setIsLoading(true);
    try {
      const data = await authApi.login(credentials);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));

      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (payload: UserRegisterRequest) => {
    setIsLoading(true);
    try {
      await authApi.register(payload);
      // Auto-login after successful registration
      const loginData = await authApi.login({
        email: payload.email,
        password: payload.password,
      });

      localStorage.setItem(TOKEN_KEY, loginData.access_token);
      if (loginData.refresh_token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, loginData.refresh_token);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(loginData.user));

      setToken(loginData.access_token);
      setUser(loginData.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const refreshed = await authApi.getMe();
      setUser(refreshed);
      localStorage.setItem(USER_KEY, JSON.stringify(refreshed));
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return context;
};

export default AuthContext;
