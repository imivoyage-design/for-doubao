import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import * as authApi from '@/api/auth';
import type { AuthUser } from '@shared/api.interface';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  register: (username: string, password: string, nickname: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch (error: unknown) {
        logger.warn('Auth init failed', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const userData = await authApi.login({ username, password });
    setUser(userData);
    return userData;
  };

  const register = async (
    username: string,
    password: string,
    nickname: string,
  ): Promise<AuthUser> => {
    return authApi.register({ username, password, nickname });
  };

  const logout = async (): Promise<void> => {
    await authApi.logout();
    setUser(null);
  };

  const refreshUser = async (): Promise<void> => {
    const me = await authApi.getMe();
    setUser(me);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
