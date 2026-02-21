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
        backgroundImage: 'radial-gradient(rgba(26,10,14,0.05) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Sidebar – minimal, nur Icons, verschwindet im Focus Mode */}
      <aside
        className={`w-20 shrink-0 bg-cream flex flex-col transition-all duration-300 ${navOpacity}`}
      >
        <div className="p-3 border-b border-dark/[0.06]">
          <span className="font-display text-sm font-medium text-dark/30 block truncate" aria-label="Türkçe Pro">
            TP
          </span>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              title={label}
              onClick={() => setActiveTab(id)}
              className={`flex items-center justify-center p-2.5 rounded-btn transition-colors ${
                activeTab === id
                  ? 'text-brand bg-brand/10'
                  : 'text-dark/30 hover:bg-dark/[0.06] hover:text-dark/60'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-dark/[0.06] space-y-2">
          <button
            type="button"
            title="Abmelden"
            onClick={handleLogout}
            className="flex items-center justify-center w-full p-2.5 rounded-btn text-dark/30 hover:bg-dark/[0.06] hover:text-dark/60 transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
          </button>
          <p className="text-[10px] uppercase tracking-widest text-dark/30 text-center px-1">
            Türkçe Pro v1.0
          </p>
        </div>
      </aside>

      {/* Main content – bei Focus Mode Card zentrieren */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div
          className={`max-w-4xl w-full mx-auto flex-1 px-4 sm:px-6 py-8 flex flex-col gap-8 transition-all duration-300 ${
            writingFocused && activeTab === 'writing'
              ? 'justify-center items-center min-h-[calc(100vh-0px)]'
              : ''
          }`}
        >
          {activeTab === 'writing' && (
            <div className="w-full relative">
              {/* Feine vertikale Linie links neben der Card (nur Schreib-Ansicht) */}
              <div
                className="absolute left-0 top-0 bottom-0 w-px bg-dark/[0.06] hidden sm:block -ml-4 sm:-ml-6"
                aria-hidden
              />
              <DailyWriting onWritingFocusChange={setWritingFocused} />
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
