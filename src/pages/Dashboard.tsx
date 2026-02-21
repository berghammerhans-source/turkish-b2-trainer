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

  const navOpacity = writingFocused ? 'opacity-20' : 'opacity-100';

  return (
    <div className="min-h-screen bg-cream flex font-sans">
      {/* Sidebar – schmal, bg-cream, löst sich optisch im Hintergrund auf */}
      <aside
        className={`w-44 shrink-0 bg-cream flex flex-col transition-opacity duration-200 ${navOpacity}`}
      >
        <div className="p-4 border-b border-dark/[0.06]">
          <span className="font-display text-lg font-medium text-dark/35">Türkçe Pro</span>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-0.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-btn text-left text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-brand text-white'
                  : 'text-dark/50 hover:bg-dark/[0.06] hover:text-dark/80'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-dark/[0.06]">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-btn text-sm font-medium text-dark/50 hover:bg-dark/[0.06] hover:text-dark/80 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="max-w-4xl w-full mx-auto flex-1 px-4 sm:px-6 py-8 flex flex-col gap-8">
          {activeTab === 'writing' && (
            <DailyWriting onWritingFocusChange={setWritingFocused} />
          )}
          {activeTab === 'mistakes' && <MistakeTracker />}
          {activeTab === 'history' && <ExerciseHistory />}
          {activeTab === 'deyimler' && <DeyimlerLibrary />}
        </div>
      </main>
    </div>
  );
}
