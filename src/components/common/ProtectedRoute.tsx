import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoginPage } from '../../pages/LoginPage';
import { Building2, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onOpenSupabaseModal?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onOpenSupabaseModal }) => {
  const { isAuthenticated, user, isLoading, login } = useAuth();

  // Enforce URL synchronization whenever unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  // Loading state splash: ZERO protected content or dashboard metrics are mounted or flashed
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070F1E] flex flex-col items-center justify-center text-slate-100 font-sans p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-xl shadow-orange-600/30 ring-4 ring-white/10 animate-pulse">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Investxindia IFBMS</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verifying enterprise security credentials & session state...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-orange-400 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />
            <span>Validating PostgreSQL Session</span>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated / Missing Profile / Inactive: Strictly render LoginPage
  if (!isAuthenticated || !user || user.status !== 'active') {
    return (
      <LoginPage
        onLoginSuccess={login}
        onOpenSupabaseModal={onOpenSupabaseModal}
      />
    );
  }

  // Authenticated: Render protected application content
  return <>{children}</>;
};
