-- Führe dieses Script im Supabase SQL Editor aus,
-- um die flashcards Tabelle und source_pdfs Erweiterungen einzurichten.

-- 1. total_cards_extracted zu source_pdfs hinzufügen
ALTER TABLE source_pdfs ADD COLUMN IF NOT EXISTS total_cards_extracted INTEGER DEFAULT 0;

-- 2. UPDATE Policy für source_pdfs (Status und total_cards_extracted aktualisieren)
DROP POLICY IF EXISTS "Users can update own source_pdfs" ON source_pdfs;
CREATE POLICY "Users can update own source_pdfs"
  ON source_pdfs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Tabelle flashcards erstellen
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_pdf_id UUID NOT NULL REFERENCES source_pdfs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grammar', 'vocabulary')),
  question_de TEXT NOT NULL,
  answer_tr TEXT NOT NULL,
  explanation_de TEXT,
  chapter_number INTEGER,
  chapter_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flashcards"
  ON flashcards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flashcards"
  ON flashcards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards"
  ON flashcards FOR DELETE
  USING (auth.uid() = user_id);
