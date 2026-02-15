-- Führe dieses Script im Supabase SQL Editor aus,
-- um die source_pdfs Tabelle und den Storage-Bucket einzurichten.

-- 1. Tabelle source_pdfs erstellen
CREATE TABLE IF NOT EXISTS source_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE source_pdfs ENABLE ROW LEVEL SECURITY;

-- Policy: Nutzer können nur eigene Einträge sehen
CREATE POLICY "Users can view own source_pdfs"
  ON source_pdfs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Nutzer können nur eigene Einträge einfügen
CREATE POLICY "Users can insert own source_pdfs"
  ON source_pdfs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Nutzer können nur eigene Einträge löschen
CREATE POLICY "Users can delete own source_pdfs"
  ON source_pdfs FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Storage-Bucket "pdf-uploads" erstellen (im Supabase Dashboard unter Storage)
-- Oder per SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-uploads',
  'pdf-uploads',
  false,
  52428800,  -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Nutzer können in ihren eigenen Ordner hochladen
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdf-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage Policy: Nutzer können ihre eigenen Dateien lesen
CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdf-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage Policy: Nutzer können ihre eigenen Dateien löschen
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdf-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
