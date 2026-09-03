import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@flowbyte/types';
import { client } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthed: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await client.me();
        setUser(me);
      } catch (err) {
        console.error('[Auth] me() failed:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (usernameOrEmail: string, password: string) => {
    const res = await client.login({ usernameOrEmail, password });
    setUser(res.user);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const res = await client.register({ username, email, password });
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await client.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, isAuthed: !!user, login, register, logout }),
    [user, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}