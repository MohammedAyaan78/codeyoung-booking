import { createContext, useContext } from 'react';
import { AuthUser } from '@codeyoung/shared';

export interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Re-export AuthProvider so existing imports of AuthProvider from useAuth still work
export { AuthProvider } from './AuthProvider';
