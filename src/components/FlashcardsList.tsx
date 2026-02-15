import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Flashcard = {
  id: string;
  user_id: string;
  source_pdf_id: string;
  card_type: 'grammar' | 'vocabulary';
  question_de: string;
  answer_tr: string;
  explanation_de: string | null;
  chapter_number: number | null;
  chapter_title: string | null;
  created_at: string;
};

type GroupKey = string;

function groupFlashcards(flashcards: Flashcard[]): Map<GroupKey, Flashcard[]> {
  const groups = new Map<GroupKey, Flashcard[]>();
  for (const card of flashcards) {
    const typeLabel = card.card_type === 'grammar' ? 'grammar' : 'vocabulary';
    const chapter = card.chapter_number ?? 0;
    const key: GroupKey = `${typeLabel}|${chapter}|${card.chapter_title ?? ''}`;
    const existing = groups.get(key) ?? [];
    existing.push(card);
    groups.set(key, existing);
  }
  return groups;
}

export default function FlashcardsList() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlashcards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('flashcards')
        .select('*')
        .order('chapter_number', { ascending: true })
        .order('card_type', { ascending: true });

      if (fetchError) throw fetchError;
      setFlashcards((data as Flashcard[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  const groups = groupFlashcards(flashcards);
  const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) => {
    const [typeA, chapterA] = a.split('|');
    const [typeB, chapterB] = b.split('|');
    if (typeA !== typeB) return typeA === 'grammar' ? -1 : 1;
    return Number(chapterA) - Number(chapterB);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-800">Meine Karteikarten</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 shadow-md animate-pulse">
              <div className="space-y-3">
                <div className="h-5 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-800">Meine Karteikarten</h3>
        <div className="rounded-lg bg-red-50 text-red-700 p-4 border border-red-100">
          {error}
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-gray-800">Meine Karteikarten</h3>
        <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-blue-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Noch keine Karteikarten</p>
          <p className="text-sm text-gray-500 mt-1">Lade PDFs hoch und verarbeite sie, um Karteikarten zu erstellen</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-800">Meine Karteikarten</h3>
      <div className="space-y-8">
        {sortedGroupKeys.map((key) => {
          const cards = groups.get(key) ?? [];
          const first = cards[0];
          if (!first) return null;
          const typeLabel = first.card_type === 'grammar' ? 'Grammatik' : 'Vokabular';
          const borderAccent = first.card_type === 'grammar' ? 'border-l-blue-500' : 'border-l-emerald-500';
          const badgeColor = first.card_type === 'grammar' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800';
          const chapterInfo = first.chapter_title
            ? `Kapitel ${first.chapter_number ?? '?'}: ${first.chapter_title}`
            : first.chapter_number
              ? `Kapitel ${first.chapter_number}`
              : null;

          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold ${badgeColor}`}>
                  {typeLabel}
                </span>
                {chapterInfo && (
                  <span className="text-sm text-gray-500">{chapterInfo}</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className={`rounded-lg border border-gray-200 border-l-4 bg-white p-6 shadow-md hover:shadow-xl transition-all ${borderAccent}`}
                  >
                    <p className="font-bold text-gray-800 mb-2">{card.question_de}</p>
                    <p className="text-blue-700 font-medium mb-1">{card.answer_tr}</p>
                    {card.explanation_de && (
                      <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                        {card.explanation_de}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
