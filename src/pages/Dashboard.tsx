import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DailyWriting } from '../components/DailyWriting';
import { MistakeTracker } from '../components/MistakeTracker';
import { ExerciseHistory } from '../components/ExerciseHistory';
import { DeyimlerLibrary } from '../components/DeyimlerLibrary';
import { PenLine, Target, History, BookOpen, LogOut } from 'lucide-react';

type TabId = 'writing' | 'mistakes' | 'history' | 'deyimler';

const NAV_ITEMS: { id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'writing', label: 'Tägliche Übung', Icon: PenLine },
  { id: 'mistakes', label: 'Meine Fehler', Icon: Target },
  { id: 'history', label: 'Meine Übungen', Icon: History },
  { id: 'deyimler', label: 'Meine Deyimler', Icon: BookOpen },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('writing');
  const [writingFocused, setWritingFocused] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setChecking(false);
      if (!session) navigate('/', { replace: true });
    });
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-dark font-medium">Wird geladen…</p>
        </div>
      </div>
    );
  }

  const navOpacity = writingFocused ? 'opacity-0 pointer-events-none' : 'opacity-100';

  return (
    <div
      className="min-h-screen bg-cream flex font-sans relative"
      style={{
        backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
        backgroundSize: '16px 16px',
      }}
    >
      {/* Sidebar – w-64, klarer Hintergrund, Labels sichtbar */}
      <aside
        className={`w-64 shrink-0 bg-white border-r border-dark/[0.06] flex flex-col transition-all duration-300 ${navOpacity}`}
      >
        <div className="p-4 border-b border-dark/[0.06]">
          <span className="font-display text-lg font-medium text-dark/80">Türkçe Pro</span>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-btn text-left text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'text-brand bg-brand/10'
                  : 'text-dark/70 hover:bg-dark/[0.06] hover:text-dark'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 pt-3 pb-8 border-t border-dark/[0.06] space-y-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-btn text-sm font-medium text-dark/80 hover:bg-dark/[0.06] hover:text-dark transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            Abmelden
          </button>
          <p className="text-[10px] uppercase tracking-widest text-dark/30 text-center px-1 pt-1">
            Türkçe Pro v1.0
          </p>
        </div>
      </aside>

      {/* Main content – max-w-5xl, 2-Spalten auf großen Bildschirmen */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div
          className={`max-w-5xl w-full mx-auto flex-1 px-4 sm:px-6 py-8 flex flex-col gap-8 transition-all duration-300 ${
            writingFocused && activeTab === 'writing'
              ? 'justify-center items-center min-h-[calc(100vh-0px)]'
              : ''
          }`}
        >
          {activeTab === 'writing' && (
            <div className="w-full grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 lg:gap-10">
              <div className="min-w-0 relative">
                <div
                  className="absolute left-0 top-0 bottom-0 w-px bg-dark/[0.06] hidden sm:block -ml-4 sm:-ml-6"
                  aria-hidden
                />
                <DailyWriting onWritingFocusChange={setWritingFocused} />
              </div>
              {/* Rechte Spalte: Stats & Tipps (nur wenn nicht im Focus Mode) */}
              {!writingFocused && (
                <aside className="hidden lg:block space-y-6">
                  <div className="bg-white rounded-xl border border-cream-dark/5 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.06)]">
                    <h3 className="font-display text-sm font-semibold text-dark/80 uppercase tracking-wide mb-3">
                      Heutiges Ziel
                    </h3>
                    <p className="text-dark/70 text-sm font-sans">Mind. 100 Wörter auf Türkisch schreiben.</p>
                  </div>
                  <div className="bg-white rounded-xl border border-cream-dark/5 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.06)]">
                    <h3 className="font-display text-sm font-semibold text-dark/80 uppercase tracking-wide mb-3">
                      Tipps
                    </h3>
                    <ul className="text-dark/60 text-sm font-sans space-y-2 list-disc list-inside">
                      <li>Nutze die 3 Varianten (Business, Alltag, C1) nach der Analyse.</li>
                      <li>Korrekturen zeigen dir typische Muster – baue sie in deinen Wortschatz ein.</li>
                      <li>Deyimler machen deinen Text natürlicher.</li>
                    </ul>
                  </div>
                </aside>
              )}
            </div>
          )}
          {activeTab === 'mistakes' && <MistakeTracker />}
          {activeTab === 'history' && <ExerciseHistory />}
          {activeTab === 'deyimler' && <DeyimlerLibrary />}
        </div>
      </main>
    </div>
  );
}
