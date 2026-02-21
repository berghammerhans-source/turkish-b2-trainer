import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Target, X, Check, PartyPopper } from 'lucide-react';

interface Mistake {
  id: string;
  mistake_type: string;
  mistake_pattern: string;
  example_wrong: string;
  example_correct: string;
  occurrences: number;
  mastery_level: number;
  last_seen: string;
}

export function MistakeTracker() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMistakes();
  }, []);

  const loadMistakes = async () => {
    try {
      const { data, error } = await supabase
        .from('mistake_tracker')
        .select('*')
        .order('occurrences', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMistakes(data || []);
    } catch (error) {
      console.error('Error loading mistakes:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMastery = async (id: string, newLevel: number) => {
    try {
      await supabase
        .from('mistake_tracker')
        .update({ mastery_level: newLevel })
        .eq('id', id);
      
      loadMistakes();
    } catch (error) {
      console.error('Error updating mastery:', error);
    }
  };

  if (loading) return <div className="text-center py-8">Lade Fehler...</div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-dark mb-1 flex items-center gap-2">
            <Target className="w-6 h-6 text-dark/40 shrink-0" />
            Deine Top-Fehler
          </h2>
          <p className="text-dark/60 text-sm font-sans">Fokussiere dich auf diese wiederkehrenden Muster</p>
        </div>

      {mistakes.length === 0 ? (
        <div className="bg-cream/50 border-l-4 border-green-500/70 p-4 rounded-btn flex items-center gap-2 font-sans">
          <PartyPopper className="w-5 h-5 text-dark/40 shrink-0" />
          <p className="text-dark/80">Noch keine Fehler getrackt! Schreibe deine erste Übung.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {mistakes.map((mistake) => (
            <div
              key={mistake.id}
              className="bg-white border-l-4 border-brand/60 p-6 rounded-xl shadow-sm"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="inline-block bg-brand/10 text-brand px-3 py-1 rounded-btn text-sm font-semibold mr-2 font-sans">
                    {mistake.mistake_type}
                  </span>
                  <span className="text-brand font-bold font-sans">
                    {mistake.occurrences}x gemacht
                  </span>
                </div>
                <div className="text-sm text-dark/50 font-sans">
                  Zuletzt: {new Date(mistake.last_seen).toLocaleDateString('de-DE')}
                </div>
              </div>

              <h3 className="font-bold text-dark mb-2 font-sans">{mistake.mistake_pattern}</h3>

              <div className="bg-red-50/80 p-3 rounded-btn mb-2 flex gap-2">
                <X className="w-4 h-4 text-dark/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-0.5 font-sans">Falsch:</p>
                  <p className="text-red-700 font-sans">{mistake.example_wrong}</p>
                </div>
              </div>

              <div className="bg-green-50/80 p-3 rounded-btn mb-3 flex gap-2">
                <Check className="w-4 h-4 text-dark/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600 mb-0.5 font-sans">Richtig:</p>
                  <p className="text-green-700 font-semibold font-sans">{mistake.example_correct}</p>
                </div>
              </div>

              {/* Mastery Level */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Beherrschung:</span>
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => updateMastery(mistake.id, level)}
                    className={`w-8 h-8 rounded ${
                      mistake.mastery_level >= level
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    } hover:opacity-80`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}