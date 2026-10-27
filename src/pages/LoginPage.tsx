import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Building2,
  UserCheck,
  ArrowRight,
  RefreshCw,
  Sparkles,
  HelpCircle,
  Check,
} from 'lucide-react';
import { authService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { UserProfile, UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onOpenSupabaseModal?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenSupabaseModal }) => {
  const [tab, setTab] = useState<'signin' | 'forgot' | 'policy'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLive = isSupabaseConfigured();

  // Handle standard Email & Password Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both corporate email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { user, error } = await authService.signIn(email, password);
      if (error || !user) {
        setErrorMessage(error || 'Invalid credentials or user record not found.');
      } else {
        setSuccessMessage(`Welcome back, ${user.name}! Authenticating session...`);
        setTimeout(() => {
          onLoginSuccess(user);
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { success, error } = await authService.resetPassword(email);
      if (!success && error) {
        setErrorMessage(error);
      } else {
        setSuccessMessage(
          `Password reset instructions have been dispatched to ${email}. Please check your inbox and spam folders.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Login for testing local sandbox perspectives
  const handleDemoLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { user, error } = await authService.signIn(demoEmail, 'DemoPass123!');
      if (user) {
        onLoginSuccess(user);
      } else {
        setErrorMessage(error || 'Demo login failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070F1E] via-[#0F1E36] to-[#0B1527] flex flex-col justify-center items-center px-4 py-8 sm:px-6 lg:px-8 text-slate-100 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-orange-600/10 via-transparent to-transparent pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-lg shadow-orange-600/25 ring-4 ring-white/10 mb-2">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Investxindia IFBMS
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Financial Business Management System · Corporate Portal
          </p>

          <div className="pt-1 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isLive
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-300 border-amber-500/30'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {isLive ? 'Supabase Cloud Connected' : 'Sandbox / Demo Mode'}
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 pb-2">
            <button
              onClick={() => {
                setTab('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'signin'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab('policy');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 pb-2 text-xs font-semibold border-b-2 transition-colors ${
                tab === 'policy'
                  ? 'border-orange-500 text-orange-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Access Policy
            </button>
            {tab === 'forgot' && (
              <button
                className="flex-1 pb-2 text-xs font-semibold border-b-2 border-orange-500 text-orange-400"
              >
                Reset Password
              </button>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/80 border border-rose-800/80 rounded-lg text-rose-200 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800/80 rounded-lg text-emerald-200 flex items-start gap-2.5 text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info.investxindia@gmail.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-9 pr-9 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-700 text-orange-600 focus:ring-orange-500 bg-slate-950"
                />
                <label htmlFor="remember-me" className="ml-2 text-xs text-slate-400">
                  Keep me authenticated on this device
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to IFBMS</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your registered corporate email to receive a cryptographically signed password reset link dispatched directly from Supabase Authentication.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="info.investxindia@gmail.com"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                <span>{isLoading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ← Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ACCESS POLICY & GOVERNANCE */}
          {tab === 'policy' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Public Registration Prohibited</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  To comply with financial distribution data privacy and regulatory compliance, public self-registration is strictly barred. Users cannot create unverified accounts or select administrative privileges.
                </p>
              </div>

              <div className="space-y-2 text-slate-300 text-[11px]">
                <p className="font-semibold text-slate-200">How User Accounts are Provisioned:</p>
                <ul className="space-y-1.5 pl-4 list-disc text-slate-400">
                  <li>
                    <strong className="text-slate-300">Super Administrator:</strong> Provisioned directly via trusted database functions in the Supabase console.
                  </li>
                  <li>
                    <strong className="text-slate-300">Operations Staff:</strong> Onboarded and activated by the Super Admin with role-scoped CRM and transaction privileges.
                  </li>
                  <li>
                    <strong className="text-slate-300">Sub-Brokers:</strong> Channel partner accounts are linked to unique ARN/sub-broker codes with tenant-isolated database access.
                  </li>
                </ul>
              </div>

              <div className="p-2.5 bg-orange-950/30 border border-orange-800/40 rounded-lg text-[11px] text-orange-300 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
                <p>
                  For credentials or account onboarding, contact the Executive Directorate at{' '}
                  <span className="font-mono text-orange-200">info.investxindia@gmail.com</span>.
                </p>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setTab('signin')}
                  className="text-xs text-orange-400 hover:text-orange-300 font-semibold"
                >
                  ← Return to Corporate Sign In
                </button>
              </div>
            </div>
          )}

          {/* Sandbox 1-Click Role Testing (Only displayed when Supabase is not configured) */}
          {!isLive && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold uppercase tracking-wider text-amber-400">
                  Sandbox 1-Click Role Switcher
                </span>
                {onOpenSupabaseModal && (
                  <button
                    onClick={onOpenSupabaseModal}
                    className="text-orange-400 hover:underline"
                  >
                    Supabase Setup
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Supabase credentials not yet populated in <code className="text-orange-300">.env</code>. You can quickly test each authorized role perspective:
              </p>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('info.investxindia@gmail.com')}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-orange-300">
                      Super Administrator
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Rajiv Malhotra · info.investxindia@gmail.com · Full System Authority
                    </p>
                  </div>
                  <Shield className="w-4 h-4 text-orange-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('neha.singhal@investxindia.com')}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-blue-300">
                      Operations Staff / RM
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Neha Singhal · CRM, Issuance & Operations (No Rule Editing)
                    </p>
                  </div>
                  <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDemoLogin('vikram.joshi@apexwealth.co.in')}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all flex items-center justify-between group"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
                      Sub-Broker Channel Partner
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Vikram Joshi (Apex Wealth) · IX-SB-101 · Tenant Isolated
                    </p>
                  </div>
                  <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="text-center space-y-1 text-[11px] text-slate-500">
          <div className="flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SSL · Row Level Security (RLS) · Zero Local Passwords</span>
          </div>
          <p>© {new Date().getFullYear()} Investxindia Corporate Distribution Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
