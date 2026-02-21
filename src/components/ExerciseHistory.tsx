import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  ScrollText,
  PenLine,
  AlertCircle,
  Sparkles,
  Briefcase,
  MessageCircle,
  GraduationCap,
  Target,
  BookOpen,
  AlertTriangle,
  ArrowLeft,
  Check,
} from 'lucide-react';

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
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-dark mb-1 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-dark/40 shrink-0" />
            Meine Übungen
          </h2>
          <p className="text-dark/60 text-sm font-sans">Alle deine bisherigen Schreibübungen und Analysen</p>
        </div>

      {exercises.length === 0 ? (
        <div className="bg-cream/50 border-l-4 border-amber-500/70 p-4 rounded-btn flex items-center gap-2 font-sans">
          <PenLine className="w-5 h-5 text-dark/40 shrink-0" />
          <p className="text-dark/80">Noch keine Übungen vorhanden. Schreibe deine erste Übung!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                onClick={() => setSelectedExercise(exercise)}
                className={`bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 font-sans ${
                  selectedExercise?.id === exercise.id
                    ? 'border-brand ring-2 ring-brand/20'
                    : 'border-dark/10'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-dark mb-1">{exercise.prompt_de}</h3>
                    <p className="text-sm text-dark/50">{formatDate(exercise.created_at)}</p>
                  </div>
                  {exercise.correction && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-btn text-xs font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3 shrink-0" />
                      Analysiert
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-dark/60 mt-3">
                  <span className="flex items-center gap-1">
                    <PenLine className="w-4 h-4 text-dark/40 shrink-0" />
                    {exercise.word_count} Wörter
                  </span>
                  {exercise.correction && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-dark/40 shrink-0" />
                      {exercise.correction.corrections?.length || 0} Korrekturen
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-6 lg:h-fit">
            {selectedExercise ? (
              <div className="bg-white rounded-xl shadow-sm p-6 font-sans">
                <h3 className="font-display text-xl font-bold text-dark mb-4">
                  {selectedExercise.prompt_de}
                </h3>

                <div className="mb-6">
                  <h4 className="font-semibold text-dark/80 mb-2 flex items-center gap-1.5">
                    <PenLine className="w-4 h-4 text-dark/40 shrink-0" />
                    Dein Text
                  </h4>
                  <div className="bg-cream/30 p-4 rounded-btn border border-dark/5 max-h-48 overflow-y-auto">
                    <p className="text-dark/90 whitespace-pre-wrap text-sm">{selectedExercise.user_text_tr}</p>
                  </div>
                </div>

                {selectedExercise.correction && (
                  <>
                    {selectedExercise.correction.corrections && selectedExercise.correction.corrections.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-dark/80 mb-3 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-dark/40 shrink-0" />
                          Korrekturen ({selectedExercise.correction.corrections.length})
                        </h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {selectedExercise.correction.corrections.map((c, i) => (
                            <div key={i} className="bg-red-50/80 p-3 rounded-btn border border-red-100">
                              <span className="text-xs bg-brand/10 text-brand px-2 py-1 rounded mr-2 font-sans">
                                {c.type}
                              </span>
                              <p className="text-red-700 line-through text-sm mt-2 font-sans">{c.original}</p>
                              <p className="text-green-700 font-semibold text-sm flex items-center gap-1 font-sans">
                                <Check className="w-3 h-3 shrink-0" />
                                {c.corrected}
                              </p>
                              <p className="text-dark/60 text-xs mt-1 font-sans">{c.explanation_de}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-6">
                      <h4 className="font-semibold text-dark/80 mb-3 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-dark/40 shrink-0" />
                        Varianten
                      </h4>
                      {selectedExercise.correction.variant_business && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-dark/60 mb-1 flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5 text-dark/40 shrink-0" />
                            Business
                          </p>
                          <div className="bg-cream/50 p-3 rounded-btn text-sm font-sans">
                            {selectedExercise.correction.variant_business}
                          </div>
                        </div>
                      )}
                      {selectedExercise.correction.variant_colloquial && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-dark/60 mb-1 flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5 text-dark/40 shrink-0" />
                            Alltag
                          </p>
                          <div className="bg-cream/50 p-3 rounded-btn text-sm font-sans">
                            {selectedExercise.correction.variant_colloquial}
                          </div>
                        </div>
                      )}
                      {selectedExercise.correction.variant_c1 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-dark/60 mb-1 flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-dark/40 shrink-0" />
                            C1
                          </p>
                          <div className="bg-cream/50 p-3 rounded-btn text-sm font-sans">
                            {selectedExercise.correction.variant_c1}
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedExercise.correction.suggested_deyimler &&
                     selectedExercise.correction.suggested_deyimler.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-dark/80 mb-3 flex items-center gap-1.5">
                          <Target className="w-4 h-4 text-dark/40 shrink-0" />
                          Deyimler ({selectedExercise.correction.suggested_deyimler.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {selectedExercise.correction.suggested_deyimler.map((d, i) => (
                            <div key={i} className="bg-amber-50/80 p-3 rounded-btn border border-amber-100">
                              <p className="font-bold text-dark text-sm font-sans">{d.deyim}</p>
                              <p className="text-dark/70 text-xs mt-1 flex items-start gap-1 font-sans">
                                <BookOpen className="w-3.5 h-3.5 text-dark/40 shrink-0 mt-0.5" />
                                {d.meaning_de}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!selectedExercise.correction && (
                  <div className="bg-amber-50/80 border-l-4 border-amber-500/70 p-4 rounded-btn flex items-center gap-2 font-sans">
                    <AlertTriangle className="w-5 h-5 text-dark/40 shrink-0" />
                    <p className="text-dark/80 text-sm">Diese Übung wurde noch nicht analysiert.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-cream/30 rounded-xl p-8 text-center text-dark/50 font-sans flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5 text-dark/40 shrink-0" />
                Wähle eine Übung aus um Details zu sehen
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}