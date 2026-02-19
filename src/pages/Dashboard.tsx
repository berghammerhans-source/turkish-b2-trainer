import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DailyWriting } from '../components/DailyWriting';
import { MistakeTracker } from '../components/MistakeTracker';
import { ExerciseHistory } from '../components/ExerciseHistory';
import { DeyimlerLibrary } from '../components/DeyimlerLibrary';

type TabId = 'writing' | 'mistakes' | 'history' | 'deyimler';

export default function Dashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('writing');

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
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-amber-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Wird geladen…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {/* Header - Turkish flag colors */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg font-bold">TR</span>
            </div>
            <h1 className="text-xl font-bold text-white">🌙 Turkish B1→C1 Trainer ⭐</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-white hover:bg-white/20 rounded-lg transition-all"
          >
            Abmelden
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mt-6 px-4 sm:px-6">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('writing')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'writing'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📝 Tägliche Übung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mistakes')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'mistakes'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🎯 Meine Fehler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📜 Meine Übungen
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deyimler')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'deyimler'
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📚 Meine Deyimler
          </button>
        </div>
      </div>

      {/* Active Content */}
      <main className="bg-gradient-to-br from-red-50 to-amber-50 max-w-6xl mx-auto p-8">
        {activeTab === 'writing' && <DailyWriting />}
        {activeTab === 'mistakes' && <MistakeTracker />}
        {activeTab === 'history' && <ExerciseHistory />}
        {activeTab === 'deyimler' && <DeyimlerLibrary />}
      </main>
    </div>
  );
}
