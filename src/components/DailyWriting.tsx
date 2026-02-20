import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

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

export function DailyWriting() {
  const [prompt] = useState(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [useCustomTopic, setUseCustomTopic] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [userText, setUserText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(null);

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-2">📝 Tägliche Schreibübung</h2>
        <p className="text-red-100">Schreibe mindestens 100 Wörter auf Türkisch</p>
      </div>

      {/* Topic selection */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={!useCustomTopic}
            onChange={() => setUseCustomTopic(false)}
            className="w-4 h-4"
          />
          <span>🎲 Zufälliges Thema</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            checked={useCustomTopic}
            onChange={() => setUseCustomTopic(true)}
            className="w-4 h-4"
          />
          <span>✍️ Eigenes Thema</span>
        </label>
      </div>

      {/* Prompt */}
      {!useCustomTopic ? (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
          <p className="font-semibold text-amber-800">Thema:</p>
          <p className="text-amber-900">{prompt}</p>
        </div>
      ) : (
        <div className="mb-4">
          <label className="block font-semibold text-amber-800 mb-2">Dein Thema:</label>
          <input
            type="text"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="z.B. Meine Reise nach Istanbul"
            className="w-full p-4 border border-amber-300 rounded-lg bg-amber-50 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            disabled={loading || analysis !== null}
          />
        </div>
      )}

      {/* Textfeld */}
      <textarea
        value={userText}
        onChange={(e) => setUserText(e.target.value)}
        className="w-full h-64 p-4 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-red-500"
        placeholder="Schreibe hier auf Türkisch..."
      />

      <div className="flex justify-between items-center mb-6">
        <span className="text-gray-600">
          {userText.split(/\s+/).filter(w => w).length} Wörter
        </span>
        <button
          onClick={handleSubmit}
          disabled={loading || analysis !== null}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
        >
          {loading ? '⏳ Analysiere...' : '🚀 Analysieren'}
        </button>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Corrections */}
          {analysis.corrections && analysis.corrections.length > 0 && (
            <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-red-700">🔴 Korrekturen ({analysis.corrections.length})</h3>
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
            <div className="bg-white border-l-4 border-red-500 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-red-700">✨ 3 Varianten</h3>
              
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">💼 Business Formell:</h4>
                <p className="bg-red-50 p-3 rounded">{analysis.variants.business_formal}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">💬 Schlagfertig Alltag:</h4>
                <p className="bg-green-50 p-3 rounded">{analysis.variants.colloquial_smart}</p>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-2">🎓 C1 Sophistiziert:</h4>
                <p className="bg-amber-50 p-3 rounded">{analysis.variants.c1_sophisticated}</p>
              </div>
            </div>
          )}

          {/* Deyimler */}
          {analysis.suggested_deyimler && analysis.suggested_deyimler.length > 0 && (
            <div className="bg-white border-l-4 border-amber-500 p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold mb-4 text-amber-800">🎯 Deyimler für dich</h3>
              <div className="space-y-3">
                {analysis.suggested_deyimler.map((d, i) => (
                  <div key={i} className="bg-amber-50 p-4 rounded">
                    <p className="font-bold text-amber-900 mb-1">{d.deyim}</p>
                    <p className="text-gray-700 mb-1">📖 {d.meaning_de}</p>
                    <p className="text-sm text-gray-600 mb-2">💡 {d.usage}</p>
                    <p className="text-sm bg-white p-2 rounded italic">{d.example_in_context}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setUserText('');
              setAnalysis(null);
            }}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
          >
            ✅ Neue Übung starten
          </button>
        </div>
      )}
    </div>
  );
}