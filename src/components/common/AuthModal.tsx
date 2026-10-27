import React, { useState } from 'react';
import { Modal } from './Modal';
import { Lock, Mail, Key, AlertCircle, CheckCircle2, Shield, User } from 'lucide-react';
import { authService } from '../../services/supabaseService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetMode, setIsResetMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isConfigured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (!isResetMode) {
        const { user, error } = await authService.signIn(email, password);
        if (error) {
          setErrorMessage(error);
        } else {
          setSuccessMessage('Signed in successfully.');
          setTimeout(() => {
            onAuthSuccess();
            onClose();
          }, 800);
        }
      } else {
        const { success, error } = await authService.resetPassword(email);
        if (error || !success) {
          setErrorMessage(error || 'Failed to dispatch reset email.');
        } else {
          setSuccessMessage(`Password reset link dispatched to ${email}. Check your inbox.`);
          setIsResetMode(false);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isResetMode ? 'Reset IFBMS Account Password' : 'Sign in to Investxindia IFBMS'}
      subtitle={
        isConfigured
          ? 'Connecting directly to Supabase Authentication'
          : 'Local Sandbox Mode (Supabase environment variables not yet populated)'
      }
      maxWidth="md"
    >
      <div className="space-y-4 text-xs">
        {!isConfigured && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Local Sandbox Mode:</strong> Real Supabase project credentials are not yet configured in <code className="font-mono">.env</code>. You can test role perspectives using the quick switcher in the top navigation, or connect Supabase using the "Supabase Setup" button.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Corporate Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info.investxindia@gmail.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {!isResetMode && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-orange-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-orange-500 font-mono"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? 'Processing...' : isResetMode ? 'Send Reset Link' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          {isResetMode ? (
            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="text-orange-600 font-semibold hover:underline"
            >
              ← Back to Sign In
            </button>
          ) : (
            <span className="italic">
              Public registration is disabled. Accounts are provisioned exclusively by administrators.
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
};
