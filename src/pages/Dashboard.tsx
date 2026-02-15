import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PDFUpload from '../components/PDFUpload';
import FlashcardsList from '../components/FlashcardsList';

export default function Dashboard() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 font-medium">Wird geladen…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      {/* Navigation */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white text-lg font-bold">TR</span>
            </div>
            <h1 className="text-xl font-bold text-white">Turkish B2 Trainer</h1>
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

      {/* Main Content */}
      <main className="bg-gradient-to-br from-blue-50 to-indigo-50 max-w-6xl mx-auto p-8 space-y-12">
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">PDF-Lehrbücher hochladen</h2>
          <p className="text-gray-600">
            Lade deine türkischen Lehrbücher als PDF hoch, um sie für dein Training zu nutzen.
          </p>
          <PDFUpload />
        </section>
        <section>
          <FlashcardsList />
        </section>
      </main>
    </div>
  );
}
