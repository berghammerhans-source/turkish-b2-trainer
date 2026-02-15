import React, { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';

const BUCKET = 'pdf-uploads';

const ERROR_MESSAGES: Record<string, string> = {
  'new row violates row-level security policy': 'Keine Berechtigung für diese Aktion.',
  'StorageApiError': 'Fehler beim Hochladen. Überprüfe die Storage-Konfiguration.',
  'JWT expired': 'Sitzung abgelaufen. Bitte melde dich erneut an.',
};

function getGermanError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return ERROR_MESSAGES[msg] ?? msg;
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 0.01 ? '< 0,01 MB' : `${mb.toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: string | undefined): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

async function getValidUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Nicht angemeldet. Bitte melde dich erneut an.');
  }
  if (!isValidUuid(user.id)) {
    throw new Error('Ungültige Benutzer-ID. Bitte melde dich erneut an.');
  }
  return user.id;
}

export type PDFRecord = {
  id: string;
  filename: string;
  storage_path: string;
  status: string;
  created_at: string;
};

export default function PDFUpload() {
  const [pdfs, setPdfs] = useState<PDFRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    filename: string;
  } | null>(null);
  const [processingPdfId, setProcessingPdfId] = useState<string | null>(null);

  const fetchPdfs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getValidUserId();
      const { data, error: fetchError } = await supabase
        .from('source_pdfs')
        .select('id, filename, storage_path, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPdfs((data as PDFRecord[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : getGermanError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const uploadFile = async (file: File) => {
    const userId = await getValidUserId();
    const safeName = String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFilename = `${Date.now()}-${safeName}`;
    const storagePath = `${userId}/${uniqueFilename}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: insertData, error: insertError } = await supabase
      .from('source_pdfs')
      .insert({
        user_id: userId,
        filename: file.name,
        storage_path: storagePath,
        status: 'pending',
      })
      .select('id, filename, storage_path, status, created_at')
      .single();

    if (insertError) throw insertError;
    return insertData as PDFRecord;
  };

  const handleDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    setSuccessMessage(null);
    setPendingFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const newFiles = acceptedFiles.filter((f) => !names.has(f.name));
      return [...prev, ...newFiles];
    });
  }, []);

  const onDropRejected = useCallback(() => {
    setError('Nur PDF-Dateien (.pdf) sind erlaubt.');
  }, []);

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleUpload = async () => {
    if (!pendingFiles.length) return;
    setError(null);
    setSuccessMessage(null);
    const total = pendingFiles.length;

    for (let i = 0; i < total; i++) {
      const file = pendingFiles[i];
      const filename = typeof file.name === 'string' ? file.name : 'Unbekannt';
      setUploadProgress({ current: i + 1, total, filename });
      try {
        const record = await uploadFile(file);
        setPdfs((prev) => [record, ...prev]);
      } catch (err) {
        setError(`${filename}: ${getGermanError(err)}`);
        setUploadProgress(null);
        return;
      }
    }

    setPendingFiles([]);
    setUploadProgress(null);
    setSuccessMessage(
      total === 1 ? 'PDF erfolgreich hochgeladen.' : `${total} PDFs erfolgreich hochgeladen.`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const processPDF = async (pdfId: string, storagePath: string, filename: string) => {
    setError(null);
    setProcessingPdfId(pdfId);
    setPdfs((prev) => prev.map((p) => (p.id === pdfId ? { ...p, status: 'processing' } : p)));

    try {
      const userId = await getValidUserId();

      const { error: updateError } = await supabase
        .from('source_pdfs')
        .update({ status: 'processing' })
        .eq('id', pdfId);
      if (updateError) throw updateError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);
      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error('Signed URL konnte nicht erstellt werden.');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('process-pdf', {
        body: JSON.stringify({
          pdfUrl: signedUrlData.signedUrl,
          filename,
          pdfId,
        }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });

      if (invokeError) throw invokeError;
      const errorMsg = data?.error;
      if (errorMsg) {
        throw new Error(typeof errorMsg === 'string' ? errorMsg : (errorMsg as { message?: string })?.message ?? 'Unbekannter Fehler');
      }

      const responseData = data?.data ?? data;
      const chapters = responseData?.chapters ?? [];

      const flashcardsToInsert: Array<{
        user_id: string;
        source_pdf_id: string;
        card_type: 'grammar' | 'vocabulary';
        question_de: string;
        answer_tr: string;
        explanation_de: string | null;
        chapter_number: number | null;
        chapter_title: string | null;
      }> = [];

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        const chapterNumber = i + 1;
        const chapterTitle = ch?.title ?? null;
        for (const g of ch?.grammar ?? []) {
          const questionDe = g?.point?.trim() ?? '';
          const answerTr = g?.examples?.[0] ?? '';
          if (questionDe) {
            flashcardsToInsert.push({
              user_id: userId,
              source_pdf_id: pdfId,
              card_type: 'grammar',
              question_de: questionDe,
              answer_tr: answerTr,
              explanation_de: g?.german_explanation?.trim() ?? null,
              chapter_number: chapterNumber,
              chapter_title: chapterTitle,
            });
          }
        }
        for (const v of ch?.vocabulary ?? []) {
          const questionDe = v?.word?.trim() ?? '';
          const answerTr = v?.translation_german?.trim() ?? '';
          if (questionDe && answerTr) {
            flashcardsToInsert.push({
              user_id: userId,
              source_pdf_id: pdfId,
              card_type: 'vocabulary',
              question_de: questionDe,
              answer_tr: answerTr,
              explanation_de: v?.example?.trim() ?? null,
              chapter_number: chapterNumber,
              chapter_title: chapterTitle,
            });
          }
        }
      }

      if (flashcardsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('flashcards').insert(flashcardsToInsert);
        if (insertError) throw insertError;
      }

      const { error: finalUpdateError } = await supabase
        .from('source_pdfs')
        .update({
          status: 'ready',
          total_cards_extracted: flashcardsToInsert.length,
        })
        .eq('id', pdfId);
      if (finalUpdateError) throw finalUpdateError;

      setPdfs((prev) =>
        prev.map((p) => (p.id === pdfId ? { ...p, status: 'ready' } : p))
      );
      setSuccessMessage(
        `${filename}: ${flashcardsToInsert.length} Karten extrahiert und gespeichert.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      let msg: string;
      if (err instanceof Error) {
        msg = err.message;
      } else if (typeof err === 'string') {
        msg = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        msg = String((err as { message: unknown }).message);
      } else {
        const fallback = getGermanError(err);
        msg = fallback === '[object Object]' ? 'Unbekannter Fehler' : fallback;
      }
      setError(`${filename}: ${msg}`);
      setPdfs((prev) =>
        prev.map((p) => (p.id === pdfId ? { ...p, status: 'error' } : p))
      );
      await supabase
        .from('source_pdfs')
        .update({ status: 'error' })
        .eq('id', pdfId);
    } finally {
      setProcessingPdfId(null);
    }
  };

  const handleDelete = async (id: string, storagePath: string, filename: string) => {
    setError(null);
    try {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      const { error: deleteError } = await supabase
        .from('source_pdfs')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setPdfs((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(`${filename}: ${getGermanError(err)}`);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    onDropRejected,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
    disabled: !!uploadProgress,
    noClick: !!uploadProgress,
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      processing: 'Verarbeitung',
      ready: 'Fertig',
      error: 'Fehler',
    };
    return labels[status] ?? status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-800',
      processing: 'bg-blue-100 text-blue-800',
      ready: 'bg-emerald-100 text-emerald-800',
      error: 'bg-red-100 text-red-800',
    };
    return colors[status] ?? 'bg-gray-100 text-gray-800';
  };

  const getBorderAccent = (status: string) => {
    const accents: Record<string, string> = {
      pending: 'border-l-4 border-l-amber-500',
      processing: 'border-l-4 border-l-blue-500',
      ready: 'border-l-4 border-l-emerald-500',
      error: 'border-l-4 border-l-red-500',
    };
    return accents[status] ?? 'border-l-4 border-l-gray-400';
  };

  const UploadIcon = ({ className = 'h-8 w-8' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );

  const PdfIcon = ({ className = 'h-10 w-10' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15h2" />
      <path d="M9 19h2" />
      <path d="M13 11h2" />
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Dropzone - kompakt */}
      <div
        {...getRootProps()}
        className={`
          relative max-h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all shadow-md
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50'
          }
          ${uploadProgress ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3 transition-colors ${isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-blue-50 text-blue-500'}`}>
          <UploadIcon className="h-7 w-7" />
        </div>
        <p className="text-gray-800 font-semibold mb-0.5">PDF hier ablegen oder klicken</p>
        <p className="text-sm text-gray-500">Nur .pdf erlaubt • Mehrere Dateien möglich</p>
      </div>

      {/* Ausgewählte Dateien vor Upload */}
      {pendingFiles.length > 0 && !uploadProgress && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-md">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">
              Ausgewählte Dateien ({pendingFiles.length})
            </h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {pendingFiles.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <PdfIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {typeof file.name === 'string' ? file.name : 'Unbekannte Datei'}
                    </p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePendingFile(index);
                  }}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Entfernen"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={handleUpload}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm transition-all"
            >
              Hochladen
            </button>
          </div>
        </div>
      )}

      {/* Upload-Fortschritt */}
      {uploadProgress && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
          <div className="flex items-center gap-3 text-gray-700 mb-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="font-medium">
              Lade {uploadProgress.filename} hoch ({uploadProgress.current} von {uploadProgress.total})
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 text-sm border border-red-100">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 text-emerald-700 text-sm border border-emerald-100">
          {successMessage}
        </div>
      )}

      {/* Hochgeladene PDFs */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Hochgeladene PDFs</h3>
        {loading && pdfs.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 shadow-md animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                    <div className="h-5 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : pdfs.length === 0 ? (
          <div className="py-12 px-6 border-2 border-dashed border-gray-200 rounded-xl text-center">
            <div className="w-16 h-16 mx-auto mb-3 rounded-xl bg-gray-100 flex items-center justify-center">
              <PdfIcon className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">Noch keine PDFs hochgeladen</p>
            <p className="text-sm text-gray-500 mt-1">Ziehe PDF-Dateien in die Zone oben</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pdfs.map((pdf) => (
              <div
                key={pdf.id}
                className={`rounded-lg border border-gray-200 bg-white p-6 shadow-md hover:shadow-xl transition-all ${getBorderAccent(pdf.status)}`}
              >
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <PdfIcon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800 truncate">{pdf.filename}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDate(pdf.created_at)}</p>
                    <span
                      className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-lg text-xs font-medium ${getStatusColor(pdf.status)}`}
                    >
                      {pdf.status === 'processing' && processingPdfId === pdf.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Verarbeitung
                        </>
                      ) : (
                        getStatusLabel(pdf.status)
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  {pdf.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => processPDF(pdf.id, pdf.storage_path, pdf.filename)}
                      disabled={!!processingPdfId}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Verarbeiten
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(pdf.id, pdf.storage_path, pdf.filename)}
                    disabled={!!processingPdfId}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="PDF löschen"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
