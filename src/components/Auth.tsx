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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#111' }}>

      {/* ── LEFT: Turkish flag panel ── */}
      <div style={{
        width: '50%',
        background: '#E30A17',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
      }}>
        {/* Turkish flag symbol - centered watermark */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '200px',
          color: 'white',
          opacity: 0.15,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>☽★</div>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '44px', height: '44px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '16px',
          }}>TR</div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '20px', letterSpacing: '0.03em' }}>TürkçePro</span>
        </div>

        {/* Center content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: '64px', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: '16px' }}>"</div>
          <p style={{ color: 'white', fontSize: '28px', fontWeight: 300, lineHeight: 1.5, marginBottom: '12px' }}>
            Türkisch nicht nur sprechen –<br />
            <span style={{ color: '#FFD700', fontWeight: 600 }}>wirklich beherrschen.</span>
          </p>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
            B1 → C1 · KI-Korrekturen · Deyimler · Business-Türkisch
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '40px', position: 'relative', zIndex: 1 }}>
          {[
            { num: '3', label: 'Varianten pro Text' },
            { num: '∞', label: 'Deyimler lernen' },
            { num: 'B1→C1', label: 'Niveau-Sprung' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>{s.num}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Form panel ── */}
      <div style={{
        width: '50%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Heading */}
          <h1 style={{ color: 'white', fontSize: '36px', fontWeight: 700, marginBottom: '8px' }}>
            {tab === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginBottom: '32px' }}>
            {tab === 'login' ? 'Melde dich an um weiterzuüben.' : 'Kostenlos starten – keine Kreditkarte nötig.'}
          </p>

          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '28px',
          }}>
            {(['login', 'register'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTab(t); setError(null); setSuccessMessage(null); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: tab === t ? '#E30A17' : 'transparent',
                  color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
                  fontWeight: 500,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="deine@email.de"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.border = '1px solid #E30A17'; }}
                onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
                Passwort
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.border = '1px solid #E30A17'; }}
                onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.1)'; }}
              />
              {tab === 'register' && (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', marginTop: '6px' }}>Mindestens 6 Zeichen</p>
              )}
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                background: 'rgba(227,10,23,0.15)', border: '1px solid rgba(227,10,23,0.3)',
                color: '#FCA5A5', fontSize: '14px',
              }}>
                {error}
              </div>
            )}
            {successMessage && (
              <div style={{
                padding: '12px 16px', borderRadius: '10px', marginBottom: '16px',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                color: '#86EFAC', fontSize: '14px',
              }}>
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? 'rgba(227,10,23,0.5)' : '#E30A17',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: 600,
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(227,10,23,0.4)',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Bitte warten…' : tab === 'login' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'rgba(255,255,255,0.25)' }}>
            {tab === 'login' ? 'Noch kein Konto? ' : 'Bereits registriert? '}
            <button
              type="button"
              onClick={() => { setTab(tab === 'login' ? 'register' : 'login'); setError(null); setSuccessMessage(null); }}
              style={{ color: '#FFD700', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              {tab === 'login' ? 'Jetzt registrieren' : 'Anmelden'}
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}