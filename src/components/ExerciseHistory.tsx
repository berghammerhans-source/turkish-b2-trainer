import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Exercise {
  id: string;
  prompt_de: string;
  user_text_tr: string;
  word_count: number;
  created_at: string;
}

interface Correction {
  corrections: Array<{
    original: string;
    corrected: string;
    type: string;
    explanation_de: string;
  }>;
  variant_business: string;
  variant_colloquial: string;
  variant_c1: string;
  suggested_deyimler: Array<{
    deyim: string;
    meaning_de: string;
    usage: string;
    example_in_context: string;
  }>;
}

interface ExerciseWithCorrection extends Exercise {
  correction?: Correction;
}

export function ExerciseHistory() {
  const [exercises, setExercises] = useState<ExerciseWithCorrection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithCorrection | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Lade Exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('writing_exercises')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (exercisesError) throw exercisesError;

      // Lade Corrections für jede Exercise
      const exercisesWithCorrections = await Promise.all(
        (exercisesData || []).map(async (exercise) => {
          const { data: correctionData } = await supabase
            .from('writing_corrections')
            .select('*')
            .eq('exercise_id', exercise.id)
            .single();

          return {
            ...exercise,
            correction: correctionData || undefined,
          };
        })
      );

      setExercises(exercisesWithCorrections);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Lade Historie...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-2">📜 Meine Übungen</h2>
        <p className="text-purple-100">Alle deine bisherigen Schreibübungen und Analysen</p>
      </div>

      {exercises.length === 0 ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-blue-800">📝 Noch keine Übungen vorhanden. Schreibe deine erste Übung!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste der Übungen */}
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                onClick={() => setSelectedExercise(exercise)}
                className={`bg-white p-4 rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer border-l-4 ${
                  selectedExercise?.id === exercise.id
                    ? 'border-purple-500 ring-2 ring-purple-200'
                    : 'border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{exercise.prompt_de}</h3>
                    <p className="text-sm text-gray-500">{formatDate(exercise.created_at)}</p>
                  </div>
                  {exercise.correction && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                      ✓ Analysiert
                    </span>
                  )}
                </div>
                
                <div className="flex gap-4 text-sm text-gray-600 mt-3">
                  <span>📝 {exercise.word_count} Wörter</span>
                  {exercise.correction && (
                    <span>🔴 {exercise.correction.corrections?.length || 0} Korrekturen</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Detail-Ansicht */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            {selectedExercise ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {selectedExercise.prompt_de}
                </h3>

                {/* Dein Text */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">📝 Dein Text:</h4>
                  <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-48 overflow-y-auto">
                    <p className="text-gray-800 whitespace-pre-wrap">{selectedExercise.user_text_tr}</p>
                  </div>
                </div>

                {/* Corrections */}
                {selectedExercise.correction && (
                  <>
                    {selectedExercise.correction.corrections && selectedExercise.correction.corrections.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-red-700 mb-3">
                          🔴 Korrekturen ({selectedExercise.correction.corrections.length})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {selectedExercise.correction.corrections.map((c, i) => (
                            <div key={i} className="bg-red-50 p-3 rounded border border-red-100">
                              <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded mr-2">
                                {c.type}
                              </span>
                              <p className="text-red-600 line-through text-sm mt-2">{c.original}</p>
                              <p className="text-green-600 font-semibold text-sm">✓ {c.corrected}</p>
                              <p className="text-gray-600 text-xs mt-1">{c.explanation_de}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Varianten */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-blue-700 mb-3">✨ Varianten</h4>
                      
                      {selectedExercise.correction.variant_business && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">💼 Business:</p>
                          <div className="bg-blue-50 p-3 rounded text-sm">
                            {selectedExercise.correction.variant_business}
                          </div>
                        </div>
                      )}

                      {selectedExercise.correction.variant_colloquial && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">💬 Alltag:</p>
                          <div className="bg-green-50 p-3 rounded text-sm">
                            {selectedExercise.correction.variant_colloquial}
                          </div>
                        </div>
                      )}

                      {selectedExercise.correction.variant_c1 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-gray-600 mb-1">🎓 C1:</p>
                          <div className="bg-purple-50 p-3 rounded text-sm">
                            {selectedExercise.correction.variant_c1}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deyimler */}
                    {selectedExercise.correction.suggested_deyimler && 
                     selectedExercise.correction.suggested_deyimler.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-purple-700 mb-3">
                          🎯 Deyimler ({selectedExercise.correction.suggested_deyimler.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedExercise.correction.suggested_deyimler.map((d, i) => (
                            <div key={i} className="bg-purple-50 p-3 rounded border border-purple-100">
                              <p className="font-bold text-purple-900 text-sm">{d.deyim}</p>
                              <p className="text-gray-700 text-xs mt-1">📖 {d.meaning_de}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedExercise.correction && (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                    <p className="text-amber-800 text-sm">
                      ⚠️ Diese Übung wurde noch nicht analysiert.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                👈 Wähle eine Übung aus um Details zu sehen
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}