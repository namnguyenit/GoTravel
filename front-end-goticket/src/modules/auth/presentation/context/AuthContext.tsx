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
  selectStaffOperator?: (operatorId: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  sessionError: null,
  refreshSession: async () => {},
  logout: async () => {},
  login: () => {},
});

const sessionSignature = (session: UserSession | null): string => !session ? 'guest' : JSON.stringify([
  session.id, session.email, session.fullName, session.phone, session.avatarUrl,
  session.roles.slice().sort(), session.operatorId, session.operatorName,
  session.staffCapabilities.slice().sort(), session.staffTripIds.slice().sort(), session.staffAllTrips,
  session.staffAssignments, session.staffAssignmentError,
]);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const lastRefresh = useRef(0);
  const initialized = useRef(false);

  const generation = useRef(0);
  const sessionAbort = useRef<AbortController | null>(null);
  const loggingOut = useRef(false);

  const clearLegacyAuth = () => {
    try {
      for (const key of ['token', 'access_token', 'user', 'userData', 'userInfo', 'authUser', 'role', 'roles']) {
        localStorage.removeItem(key);
      }
    } catch { /* Storage may be disabled; HttpOnly cookies remain authoritative. */ }
  };

  const refreshSession = useCallback((): Promise<void> => {
    if (loggingOut.current) return Promise.resolve();
    if (inFlight.current) return inFlight.current;
    const sequence = ++generation.current;
    const controller = new AbortController();
    sessionAbort.current = controller;
    const request = (async () => {
      if (!initialized.current) setLoading(true);
      try {
        const session = await authService.getSession(controller.signal);
        if (sequence !== generation.current || loggingOut.current) return;
        clearLegacyAuth();
        // A focus/periodic refresh must not reset forms whose effects depend on user.
        setUser(current => sessionSignature(current) === sessionSignature(session) ? current : session);
        setSessionError(null);
      } catch (reason) {
        if (sequence !== generation.current || loggingOut.current) return;
        setUser(null);
        setSessionError(reason instanceof Error ? reason.message : 'Chưa thể kiểm tra phiên đăng nhập. Vui lòng thử lại.');
      } finally {
        if (sequence === generation.current) {
          lastRefresh.current = Date.now();
          initialized.current = true;
          setLoading(false);
          inFlight.current = null;
          sessionAbort.current = null;
        }
      }
    })();
    inFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    void refreshSession();
    const sync = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 2_000) void refreshSession();
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      // Back/Forward may restore the document frozen in its old account or logout state.
      loggingOut.current = false;
      generation.current++;
      sessionAbort.current?.abort();
      inFlight.current = null;
      initialized.current = false;
      setUser(null);
      setLoading(true);
      void refreshSession();
    };
    // BroadcastChannel synchronizes same-origin tabs; cross-domain SSO uses server cookies + focus refresh.
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel('gotravel_sso_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'SSO_LOGOUT') {
          loggingOut.current = true;
          generation.current++;
          sessionAbort.current?.abort();
          clearLegacyAuth();
          setUser(null);
          setLoading(true);
          window.location.replace('/?signedOut=1');
        } else if (event.data?.type === 'SSO_LOGIN') {
          generation.current++;
          sessionAbort.current?.abort();
          inFlight.current = null;
          setUser(null);
          setLoading(true);
          void refreshSession();
        }
      };
    } catch { /* Focus/pageshow still synchronize sessions. */ }
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', restore);
    document.addEventListener('visibilitychange', sync);
    const timer = window.setInterval(sync, 30_000);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', restore);
      document.removeEventListener('visibilitychange', sync);
      window.clearInterval(timer);
      channel?.close();
      generation.current++;
      sessionAbort.current?.abort();
      inFlight.current = null;
    };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    generation.current++;
    sessionAbort.current?.abort();
    inFlight.current = null;
    setLoading(true);
    setSessionError(null);
    try {
      await authService.logout();
      clearLegacyAuth();
      setUser(null);
      try {
        const channel = new BroadcastChannel('gotravel_sso_channel');
        channel.postMessage({ type: 'SSO_LOGOUT', timestamp: Date.now() });
        channel.close();
      } catch { /* Cookie logout already succeeded. */ }
      // Clear SSO's host-only legacy cookie too, then return to the PUBLIC home.
      // Keep guards suspended until navigation; never bounce through /login here.
      window.location.replace(authService.getLogoutUrl());
    } catch (reason) {
      loggingOut.current = false;
      setUser(null);
      setSessionError(reason instanceof Error ? reason.message : 'Chưa thể đăng xuất. Vui lòng thử lại.');
      setLoading(false);
    }
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

  const accountScope = user ? `${user.id}:${user.roles.slice().sort().join(',')}:${user.operatorId || ''}` : 'guest';
  const mountedScope = useRef<{ value: string | null; epoch: number }>({ value: null, epoch: 0 });
  // Initial session resolution is not an account switch: keep public search/booking input.
  // Subsequent account/role switches still discard the previous account's page state.
  if (!loading) {
    if (mountedScope.current.value !== null && mountedScope.current.value !== accountScope) mountedScope.current.epoch++;
    mountedScope.current.value = accountScope;
  }
  return <AuthContext.Provider value={value}><React.Fragment key={mountedScope.current.epoch}>{children}</React.Fragment></AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  return useContext(AuthContext);
};

// Keep the original signed roles and owner context intact outside /staff.
export const StaffPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const parent = useContext(AuthContext);
  const [operator, setOperator] = useState('');
  const chosen = parent.user?.staffAssignments.some(a => a.operatorId === operator)
    ? operator : parent.user?.staffAssignments[0]?.operatorId || '';
  const user = useMemo(() => parent.user?.forStaffOperator(chosen) || null, [parent.user, chosen]);
  const value = useMemo(() => ({ ...parent, user, selectStaffOperator: setOperator }), [parent, user]);
  return <AuthContext.Provider value={value}><React.Fragment key={`${user?.id}:${chosen}`}>{children}</React.Fragment></AuthContext.Provider>;
};
