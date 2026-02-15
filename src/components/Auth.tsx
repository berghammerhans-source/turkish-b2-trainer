import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Tab = 'login' | 'register';

const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'Ungültige E-Mail oder Passwort.',
  'Email not confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse.',
  'User already registered': 'Diese E-Mail-Adresse ist bereits registriert.',
  'Password should be at least 6 characters': 'Das Passwort muss mindestens 6 Zeichen haben.',
  'Unable to validate email address: invalid format': 'Bitte gib eine gültige E-Mail-Adresse ein.',
  'Signup requires a valid password': 'Bitte wähle ein gültiges Passwort.',
};

function getGermanError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}

export default function Auth() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getGermanError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      setSuccessMessage('Registrierung erfolgreich. Bitte prüfe deine E-Mails zur Bestätigung.');
      setPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(getGermanError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = tab === 'login' ? handleLogin : handleRegister;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl font-bold text-slate-800 text-center mb-6">
              Willkommen
            </h1>

            <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  tab === 'login'
                    ? 'bg-white text-slate-800 shadow'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Anmelden
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(null); setSuccessMessage(null); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  tab === 'register'
                    ? 'bg-white text-slate-800 shadow'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Registrieren
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  E-Mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="deine@email.de"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Passwort
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  minLength={6}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                  placeholder="••••••••"
                />
                {tab === 'register' && (
                  <p className="mt-1 text-xs text-slate-500">Mindestens 6 Zeichen</p>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Bitte warten…' : tab === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
