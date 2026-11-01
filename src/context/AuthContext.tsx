import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { authService } from '../services/supabaseService';
import { UserProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (user: UserProfile) => void;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Authenticated ONLY if both a valid session and an active authorized database profile exist
  const isAuthenticated = useMemo(() => {
    return Boolean(session && user && user.status === 'active');
  }, [session, user]);

  // Safe profile loader that does not cause lock contention
  const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const profile = await authService.fetchProfile(userId);
      return profile;
    } catch (err: any) {
      console.error('Error fetching profile in AuthProvider:', err);
      return null;
    }
  }, []);

  // Complete, aggressive logout that purges storage, memory, and Supabase tokens
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          console.warn('Supabase signOut error:', e);
        }
      }
    } finally {
      // 1. Purge all in-memory user and session references
      setSession(null);
      setUser(null);
      setAuthError(null);

      // 2. Clear all local storage auth keys to prevent Back-button token resurrection
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (
            k &&
            (k.startsWith('sb-') ||
              k.includes('auth-token') ||
              k.includes('supabase.auth') ||
              k.includes('ifbms_active_user'))
          ) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        const sessionKeysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (
            k &&
            (k.startsWith('sb-') ||
              k.includes('auth-token') ||
              k.includes('supabase.auth') ||
              k.includes('ifbms'))
          ) {
            sessionKeysToRemove.push(k);
          }
        }
        sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch (err) {
        console.warn('Storage purge error during logout:', err);
      }

      // 3. Force browser history to /login
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }

      setIsLoading(false);
    }
  }, []);

  // Explicit session verification function callable on demand
  const verifySession = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      setUser(null);
      return false;
    }

    try {
      const {
        data: { session: currentSession },
        error,
      } = await supabase.auth.getSession();

      if (error || !currentSession?.user) {
        setSession(null);
        setUser(null);
        return false;
      }

      const profile = await loadProfile(currentSession.user.id);
      if (profile && profile.status === 'active') {
        setSession(currentSession);
        setUser(profile);
        return true;
      } else {
        await logout();
        return false;
      }
    } catch (err) {
      console.warn('Session verification exception:', err);
      setSession(null);
      setUser(null);
      return false;
    }
  }, [loadProfile, logout]);

  // Initial authentication check & Auth State Change subscriber
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      setAuthError(null);

      if (!isSupabaseConfigured()) {
        if (isMounted) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error || !initialSession?.user) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          return;
        }

        const profile = await loadProfile(initialSession.user.id);
        if (!isMounted) return;

        if (profile && profile.status === 'active') {
          setSession(initialSession);
          setUser(profile);
        } else {
          console.warn('Authorized database profile not found or inactive');
          await logout();
        }
      } catch (err: any) {
        console.error('Initialization auth error:', err);
        if (isMounted) {
          setSession(null);
          setUser(null);
          setAuthError(err.message || 'Authentication error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Subscribe to Supabase auth events
    if (isSupabaseConfigured()) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (!isMounted) return;

        if (event === 'SIGNED_OUT' || !newSession) {
          setSession(null);
          setUser(null);
          setIsLoading(false);
          if (window.location.pathname !== '/login') {
            window.history.replaceState(null, '', '/login');
          }
          return;
        }

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // De-couple DB calls from the synchronous onAuthStateChange to prevent deadlock
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              const profile = await loadProfile(newSession.user.id);
              if (!isMounted) return;

              if (profile && profile.status === 'active') {
                setSession(newSession);
                setUser(profile);
              } else {
                console.warn('Revoking session: Profile inactive or not found');
                await logout();
              }
            } catch (err) {
              console.error('Profile fetch failed during auth state change:', err);
              await logout();
            } finally {
              if (isMounted) {
                setIsLoading(false);
              }
            }
          }, 0);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [loadProfile, logout]);

  const login = useCallback((loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    // Refresh session object from Supabase client
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      isAuthenticated,
      isLoading,
      authError,
      login,
      logout,
      verifySession,
    }),
    [session, user, isAuthenticated, isLoading, authError, login, logout, verifySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
