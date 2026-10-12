import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { UserSession } from '../../domain/entity/user-session.entity';
import { authService } from '../../composition';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  sessionError: string | null;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  login: (returnPath?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sessionError: null,
  refreshSession: async () => {},
  logout: async () => {},
  login: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastRefresh = useRef(0);
  const initialized = useRef(false);

  const refreshSession = useCallback((): Promise<void> => {
    if (inFlight.current) return inFlight.current;
    const request = (async () => {
      if (!initialized.current) setLoading(true);
      try {
        const session = await authService.getSession();
        setUser(session);
        setSessionError(null);
      } catch (reason) {
        setSessionError(reason instanceof Error ? reason.message : 'Chưa thể kiểm tra phiên đăng nhập. Vui lòng thử lại.');
      } finally {
        lastRefresh.current = Date.now();
        initialized.current = true;
        setLoading(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refreshSession();
    // Cookies are shared across subdomains, but each React app must reload its state.
    const sync = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 2_000) {
        void refreshSession();
      }
    };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) void refreshSession(); };
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', restore);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', restore);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setSessionError(null);
    } catch (reason) {
      setSessionError(reason instanceof Error ? reason.message : 'Chưa thể đăng xuất. Vui lòng thử lại.');
    } finally { setLoading(false); }
  }, []);

  const login = useCallback((returnPath?: string) => {
    const url = authService.getLoginUrl(returnPath);
    if (typeof window !== 'undefined') {
      window.location.href = url;
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, sessionError, refreshSession, logout, login }),
    [user, loading, sessionError, refreshSession, logout, login]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
};
