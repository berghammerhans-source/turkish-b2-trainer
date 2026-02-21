import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  PenLine,
  Dices,
  Pencil,
  Loader2,
  Send,
  AlertCircle,
  Sparkles,
  Briefcase,
  MessageCircle,
  GraduationCap,
  Target,
  BookOpen,
  Lightbulb,
  Check,
} from 'lucide-react';

interface WritingAnalysis {
  corrections: Array<{
    original: string;
    corrected: string;
    type: string;
    explanation_de: string;
  }>;
  variants: {
    business_formal: string;
    colloquial_smart: string;
    c1_sophisticated: string;
  };
  suggested_deyimler: Array<{
    deyim: string;
    meaning_de: string;
    usage: string;
    example_in_context: string;
  }>;
}

const PROMPTS = [
  "Beschreibe deine letzte Geschäftsverhandlung",
  "Was ist deine Meinung zur aktuellen Wirtschaftslage?",
  "Erzähle von einem spannenden Fußballspiel",
  "Wie würdest du ein neues Projekt im Team vorschlagen?",
  "Beschreibe einen politischen Konflikt aus türkischer Perspektive",
];

interface DailyWritingProps {
  onWritingFocusChange?: (focused: boolean) => void;
}

export function DailyWriting({ onWritingFocusChange }: DailyWritingProps) {
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [userText, setUserText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);

  const wordCount = userText.split(/\s+/).filter((w) => w).length;

  const handleSubmit = async () => {
    if (useCustomTopic && !customTopic.trim()) {
      alert('Bitte gib ein Thema ein!');
      return;
    }
    if (userText.trim().length < 50) {
      alert('Bitte schreibe mindestens 50 Zeichen!');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Speichere Exercise
      const { data: exercise, error: exerciseError } = await supabase
        .from('writing_exercises')
        .insert({
          user_id: user.id,
          prompt_de: useCustomTopic ? customTopic : prompt,
          user_text_tr: userText,
          word_count: userText.split(/\s+/).length,
        })
        .select()
        .single();

      if (exerciseError) throw exerciseError;

      // 2. Rufe Edge Function auf
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'analyze-writing',
        {
          body: {
            exerciseId: exercise.id,
            userText: userText,
            userId: user.id,  // userId im Body statt Header
          },
        }
      );

      if (functionError) throw functionError;

      setAnalysis(functionData);
    } catch (error) {
      console.error('Error:', error);
      alert('Fehler bei der Analyse: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-xl p-8 lg:p-16 border border-cream-dark/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="pb-6 mb-6 border-b border-cream-dark/10">
          <h2 className="font-serif text-2xl text-dark font-semibold flex items-center gap-2">
            <PenLine className="w-6 h-6 text-gold shrink-0" />
            Tägliche Schreibübung
          </h2>
          <p className="text-dark/60 text-sm font-sans mt-1">Schreibe mindestens 100 Wörter auf Türkisch</p>
        </div>

        {/* Topic selection */}
        <div className="flex gap-6 mb-4 font-sans">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="radio"
              checked={!useCustomTopic}
              onChange={() => setUseCustomTopic(false)}
              className="w-4 h-4 accent-gold text-gold"
            />
            <Dices className={`w-4 h-4 shrink-0 transition-colors ${!useCustomTopic ? 'text-gold' : 'text-dark/40'}`} />
            <span className={!useCustomTopic ? 'text-dark font-medium' : 'text-dark/70'}>Zufälliges Thema</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={useCustomTopic}
              onChange={() => setUseCustomTopic(true)}
              className="w-4 h-4 accent-gold text-gold"
            />
            <Pencil className={`w-4 h-4 shrink-0 transition-colors ${useCustomTopic ? 'text-gold' : 'text-dark/40'}`} />
            <span className={useCustomTopic ? 'text-dark font-medium' : 'text-dark/70'}>Eigenes Thema</span>
          </label>
        </div>

        {/* Prompt */}
        {!useCustomTopic ? (
          <div className="bg-cream/50 border-l-4 border-gold/50 p-4 mb-6 rounded-btn font-sans">
            <p className="font-semibold text-dark/80">Thema:</p>
            <p className="text-dark/90">{prompt}</p>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block font-semibold text-dark/80 mb-2 font-sans">Dein Thema:</label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="z.B. Meine Reise nach Istanbul"
              className="w-full p-4 border border-cream-dark/30 rounded-btn bg-cream/30 focus:ring-2 focus:ring-gold/40 focus:border-gold/50 font-sans outline-none"
              disabled={loading || analysis !== null}
            />
          </div>
        )}

        {/* Textfeld – kein Rahmen/Schatten im Fokus, Schreib-Vibe */}
        <div className="mb-1">
          <textarea
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            onFocus={() => onWritingFocusChange?.(true)}
            onBlur={() => onWritingFocusChange?.(false)}
            className="w-full min-h-[280px] p-0 border-0 bg-transparent text-xl leading-[1.8] text-dark/80 focus:ring-0 focus:shadow-none outline-none font-sans resize-none placeholder:italic placeholder:font-serif placeholder:opacity-30"
            placeholder="Schreibe hier auf Türkisch..."
          />
        </div>
        <p className="text-[10px] tracking-wide opacity-40 text-dark/70 font-sans mb-6">
          {wordCount} Wörter
        </p>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || analysis !== null}
            className="rounded-full px-8 py-3 bg-brand text-white font-sans font-medium hover:shadow-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center gap-2 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Analysiere...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 shrink-0" />
                Analysieren
              </>
            )}
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="flex flex-col gap-8">
          {/* Corrections */}
          {analysis.corrections && analysis.corrections.length > 0 && (
            <div className="bg-white border-l-4 border-brand p-6 rounded-xl shadow-sm">
              <h3 className="font-display text-xl font-bold mb-4 text-dark flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-dark/40 shrink-0" />
                Korrekturen ({analysis.corrections.length})
              </h3>
              <div className="space-y-3">
                {analysis.corrections.map((c, i) => (
                  <div key={i} className="bg-red-50 p-3 rounded">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">{c.type}</span>
                    </div>
                    <p className="text-red-600 line-through mb-1">{c.original}</p>
                    <p className="text-green-600 font-semibold mb-1">✓ {c.corrected}</p>
                    <p className="text-gray-600 text-sm">{c.explanation_de}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variants */}
          {analysis.variants && (
            <div className="bg-white border-l-4 border-brand p-6 rounded-xl shadow-sm">
              <h3 className="font-display text-xl font-bold mb-4 text-dark flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-dark/40 shrink-0" />
                3 Varianten
              </h3>
              <div className="mb-4">
                <h4 className="font-sans font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-dark/40 shrink-0" />
                  Business Formell
                </h4>
                <p className="bg-cream/50 p-3 rounded-btn font-sans">{analysis.variants.business_formal}</p>
              </div>
              <div className="mb-4">
                <h4 className="font-sans font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <MessageCircle className="w-4 h-4 text-dark/40 shrink-0" />
                  Schlagfertig Alltag
                </h4>
                <p className="bg-cream/50 p-3 rounded-btn font-sans">{analysis.variants.colloquial_smart}</p>
              </div>
              <div>
                <h4 className="font-sans font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-dark/40 shrink-0" />
                  C1 Sophistiziert
                </h4>
                <p className="bg-cream/50 p-3 rounded-btn font-sans">{analysis.variants.c1_sophisticated}</p>
              </div>
            </div>
          )}

          {/* Deyimler */}
          {analysis.suggested_deyimler && analysis.suggested_deyimler.length > 0 && (
            <div className="bg-white border-l-4 border-amber-500/70 p-6 rounded-xl shadow-sm">
              <h3 className="font-display text-xl font-bold mb-4 text-dark flex items-center gap-2">
                <Target className="w-5 h-5 text-dark/40 shrink-0" />
                Deyimler für dich
              </h3>
              <div className="space-y-3">
                {analysis.suggested_deyimler.map((d, i) => (
                  <div key={i} className="bg-cream/50 p-4 rounded-btn">
                    <p className="font-bold text-dark mb-1 font-sans">{d.deyim}</p>
                    <p className="text-gray-700 mb-1 flex items-start gap-1.5 font-sans text-sm">
                      <BookOpen className="w-4 h-4 text-dark/40 shrink-0 mt-0.5" />
                      {d.meaning_de}
                    </p>
                    <p className="text-sm text-gray-600 mb-2 flex items-start gap-1.5 font-sans">
                      <Lightbulb className="w-4 h-4 text-dark/40 shrink-0 mt-0.5" />
                      {d.usage}
                    </p>
                    <p className="text-sm bg-white/60 p-2 rounded-btn italic font-sans">{d.example_in_context}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setUserText('');
              setAnalysis(null);
            }}
            className="btn w-full bg-green-600 text-white py-3 rounded-btn font-sans hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 shrink-0" />
            Neue Übung starten
          </button>
        </div>
      )}
    </div>
  );
}