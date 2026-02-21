import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookMarked, Search, PenLine, BookOpen, Lightbulb, Pencil, ArrowLeft } from 'lucide-react';

interface Deyim {
  deyim: string;
  meaning_de: string;
  usage: string;
  example_in_context: string;
  learned_count: number;
  last_seen: string;
}

export function DeyimlerLibrary() {
  const [deyimler, setDeyimler] = useState<Deyim[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeyim, setSelectedDeyim] = useState<Deyim | null>(null);

  useEffect(() => {
    loadDeyimler();
  }, []);

  const loadDeyimler = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Lade alle Corrections mit Deyimler
      const { data: correctionsData, error: correctionsError } = await supabase
        .from('writing_corrections')
        .select(`
          suggested_deyimler,
          created_at,
          writing_exercises!inner(user_id)
        `)
        .eq('writing_exercises.user_id', user.id)
        .order('created_at', { ascending: false });

      if (correctionsError) throw correctionsError;

      // Sammle alle Deyimler und zähle Vorkommen
      const deyimMap = new Map<string, Deyim>();

      correctionsData?.forEach((correction) => {
        const deyimlerArray = correction.suggested_deyimler as Array<{
          deyim: string;
          meaning_de: string;
          usage: string;
          example_in_context: string;
        }>;

        deyimlerArray?.forEach((d) => {
          if (deyimMap.has(d.deyim)) {
            const existing = deyimMap.get(d.deyim)!;
            existing.learned_count += 1;
            // Update last_seen if this correction is newer
            if (new Date(correction.created_at) > new Date(existing.last_seen)) {
              existing.last_seen = correction.created_at;
              existing.example_in_context = d.example_in_context;
            }
          } else {
            deyimMap.set(d.deyim, {
              deyim: d.deyim,
              meaning_de: d.meaning_de,
              usage: d.usage,
              example_in_context: d.example_in_context,
              learned_count: 1,
              last_seen: correction.created_at,
            });
          }
        });
      });

      // Konvertiere Map zu Array und sortiere
      const deyimlerArray = Array.from(deyimMap.values()).sort(
        (a, b) => b.learned_count - a.learned_count
      );

      setDeyimler(deyimlerArray);
    } catch (error) {
      console.error('Error loading deyimler:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDeyimler = deyimler.filter(
    (d) =>
      d.deyim.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.meaning_de.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Lade Deyimler...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="mb-6">
          <h2 className="font-display text-2xl font-bold text-dark mb-1 flex items-center gap-2">
            <BookMarked className="w-6 h-6 text-dark/40 shrink-0" />
            Mein Deyimler-Wörterbuch
          </h2>
          <p className="text-dark/60 text-sm font-sans">
            {deyimler.length} türkische Redewendungen gelernt
          </p>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark/40 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Suche nach Deyim oder Bedeutung..."
              className="w-full pl-10 pr-4 py-3 border border-dark/10 rounded-btn bg-cream/30 font-sans focus:ring-2 focus:ring-brand focus:border-brand outline-none"
            />
          </div>
        </div>

      {filteredDeyimler.length === 0 ? (
        <div className="bg-cream/50 border-l-4 border-amber-500/70 p-4 rounded-btn flex items-center gap-2 font-sans">
          {searchTerm ? (
            <>
              <Search className="w-5 h-5 text-dark/40 shrink-0" />
              <p className="text-dark/80">Keine Deyimler gefunden. Versuche einen anderen Suchbegriff.</p>
            </>
          ) : (
            <>
              <PenLine className="w-5 h-5 text-dark/40 shrink-0" />
              <p className="text-dark/80">Noch keine Deyimler gelernt! Schreibe Übungen und sammle türkische Redewendungen.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {filteredDeyimler.map((deyim, index) => (
              <div
                key={index}
                onClick={() => setSelectedDeyim(deyim)}
                className={`bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-l-4 font-sans ${
                  selectedDeyim?.deyim === deyim.deyim
                    ? 'border-amber-500/80 ring-2 ring-amber-200/50'
                    : 'border-dark/10'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-dark flex-1">{deyim.deyim}</h3>
                  <span className="bg-amber-100/80 text-amber-800 px-2 py-1 rounded-btn text-xs font-semibold">
                    {deyim.learned_count}x
                  </span>
                </div>
                <p className="text-sm text-dark/70 mb-1 flex items-start gap-1.5">
                  <BookOpen className="w-4 h-4 text-dark/40 shrink-0 mt-0.5" />
                  {deyim.meaning_de}
                </p>
                <p className="text-xs text-dark/50">
                  Zuletzt: {formatDate(deyim.last_seen)}
                </p>
              </div>
            ))}
          </div>

          <div className="lg:sticky lg:top-6 lg:h-fit">
            {selectedDeyim ? (
              <div className="bg-white rounded-xl shadow-sm p-6 font-sans">
                <h3 className="font-display text-2xl font-bold text-dark mb-4">
                  {selectedDeyim.deyim}
                </h3>

                <div className="mb-4 p-4 bg-cream/50 rounded-btn">
                  <p className="text-sm font-semibold text-dark/70 mb-1 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-dark/40 shrink-0" />
                    Bedeutung
                  </p>
                  <p className="text-dark/90">{selectedDeyim.meaning_de}</p>
                </div>

                <div className="mb-4 p-4 bg-cream/50 rounded-btn">
                  <p className="text-sm font-semibold text-dark/70 mb-1 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-dark/40 shrink-0" />
                    Verwendung
                  </p>
                  <p className="text-dark/90">{selectedDeyim.usage}</p>
                </div>

                <div className="mb-4 p-4 bg-green-50/70 rounded-btn">
                  <p className="text-sm font-semibold text-dark/70 mb-1 flex items-center gap-1.5">
                    <Pencil className="w-4 h-4 text-dark/40 shrink-0" />
                    Beispiel aus deinem Text
                  </p>
                  <p className="text-dark/90 italic">{selectedDeyim.example_in_context}</p>
                </div>

                <div className="flex gap-4 text-sm text-dark/60 pt-4 border-t border-dark/5">
                  <div>
                    <span className="font-semibold">Gelernt:</span> {selectedDeyim.learned_count}x
                  </div>
                  <div>
                    <span className="font-semibold">Zuletzt:</span> {formatDate(selectedDeyim.last_seen)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-cream/30 rounded-xl p-8 text-center text-dark/50 font-sans flex items-center justify-center gap-2">
                <ArrowLeft className="w-5 h-5 text-dark/40 shrink-0" />
                Wähle ein Deyim aus um Details zu sehen
              </div>
            )}
          </div>
        </div>
      )}

      {deyimler.length > 0 && (
        <div className="mt-6 p-4 bg-cream/50 rounded-xl border border-dark/5 font-sans">
          <div className="flex justify-around text-center">
            <div>
              <p className="font-display text-2xl font-bold text-dark">{deyimler.length}</p>
              <p className="text-sm text-dark/60">Verschiedene Deyimler</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-dark">
                {deyimler.reduce((sum, d) => sum + d.learned_count, 0)}
              </p>
              <p className="text-sm text-dark/60">Gesamt gelernt</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-dark">
                {Math.max(...deyimler.map((d) => d.learned_count), 0)}
              </p>
              <p className="text-sm text-dark/60">Häufigster Deyim</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}