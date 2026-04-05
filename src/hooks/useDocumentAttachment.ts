import { useState, useCallback } from 'react';
import { uploadChatDocument, getSessionDocument, uploadMediaForTranscription, transcribeFromUrl } from '../lib/api';
import type { ChatDocument } from '../lib/api';
import { supabase } from '../lib/supabase';

const MAX_FILE_BYTES = 500 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/flac',
  'audio/webm',
  'audio/x-m4a',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const ALLOWED_EXTS = new Set([
  'pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md',
  'mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'mp4', 'mov',
]);

const MEDIA_EXTS = new Set(['mp3', 'wav', 'm4a', 'ogg', 'flac', 'webm', 'mp4', 'mov']);
const MEDIA_TYPES = new Set([
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/flac', 'audio/webm', 'audio/x-m4a',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

export function isMediaFile(file: File): boolean {
  if (MEDIA_TYPES.has(file.type)) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MEDIA_EXTS.has(ext);
}

export type MediaType = 'audio' | 'video' | 'youtube' | null;

export interface AttachedDoc {
  documentId: string;
  filename: string;
  charCount: number;
  status: 'processing' | 'ready' | 'error';
  extractedText: string;
  errorMessage: string | null;
  mediaType: MediaType;
}

export interface UseDocumentAttachmentReturn {
  attachedDoc: AttachedDoc | null;
  isUploading: boolean;
  uploadError: string | null;
  attachFile: (file: File, sessionId: string, language?: string) => Promise<void>;
  attachUrl: (url: string, sessionId: string, language: string) => Promise<void>;
  clearAttachment: () => void;
  loadSessionDocument: (sessionId: string) => Promise<void>;
}

export function useDocumentAttachment(): UseDocumentAttachmentReturn {
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const attachFile = useCallback(async (file: File, sessionId: string, language?: string) => {
    setUploadError(null);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTS.has(ext)) {
      setUploadError('Unsupported file type. Supported: PDF, DOCX, XLSX, PPTX, TXT, MD, MP3, WAV, M4A, OGG, FLAC, MP4, MOV, WEBM.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File exceeds 500 MB limit.');
      return;
    }

    const media = isMediaFile(file);
    const mediaType: MediaType = media
      ? (file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext) ? 'video' : 'audio')
      : null;

    setIsUploading(true);
    setAttachedDoc({
      documentId: '',
      filename: file.name,
      charCount: 0,
      status: 'processing',
      extractedText: '',
      errorMessage: null,
      mediaType,
    });

    try {
      let result: { documentId: string; filename: string; charCount: number; status: string; errorMessage: string | null; mediaType?: string };

      if (media) {
        result = await uploadMediaForTranscription(file, sessionId, language || 'en');
      } else {
        result = await uploadChatDocument(file, sessionId);
      }

      if (result.status === 'error') {
        setAttachedDoc(null);
        setUploadError(result.errorMessage || 'Failed to process file.');
        return;
      }

      const { data } = await supabase
        .from('chat_documents')
        .select('extracted_text, media_type')
        .eq('id', result.documentId)
        .maybeSingle();

      const doc = data as { extracted_text?: string; media_type?: string } | null;

      setAttachedDoc({
        documentId: result.documentId,
        filename: result.filename,
        charCount: result.charCount,
        status: 'ready',
        extractedText: doc?.extracted_text ?? '',
        errorMessage: null,
        mediaType: (doc?.media_type as MediaType) ?? mediaType,
      });
    } catch (e) {
      setAttachedDoc(null);
      setUploadError((e as Error).message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const attachUrl = useCallback(async (url: string, sessionId: string, language: string) => {
    setUploadError(null);
    setIsUploading(true);
    setAttachedDoc({
      documentId: '',
      filename: 'YouTube video',
      charCount: 0,
      status: 'processing',
      extractedText: '',
      errorMessage: null,
      mediaType: 'youtube',
    });

    try {
      const result = await transcribeFromUrl(url, sessionId, language);

      if (result.status === 'error') {
        setAttachedDoc(null);
        setUploadError(result.errorMessage || 'Failed to transcribe video.');
        return;
      }

      const { data } = await supabase
        .from('chat_documents')
        .select('extracted_text')
        .eq('id', result.documentId)
        .maybeSingle();

      setAttachedDoc({
        documentId: result.documentId,
        filename: result.filename,
        charCount: result.charCount,
        status: 'ready',
        extractedText: (data as { extracted_text?: string } | null)?.extracted_text ?? '',
        errorMessage: null,
        mediaType: 'youtube',
      });
    } catch (e) {
      setAttachedDoc(null);
      setUploadError((e as Error).message || 'Transcription failed.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const clearAttachment = useCallback(() => {
    setAttachedDoc(null);
    setUploadError(null);
  }, []);

  const loadSessionDocument = useCallback(async (sessionId: string) => {
    try {
      const doc: ChatDocument | null = await getSessionDocument(sessionId);
      if (!doc) {
        setAttachedDoc(null);
        return;
      }
      setAttachedDoc({
        documentId: doc.id,
        filename: doc.filename,
        charCount: doc.char_count,
        status: doc.status as 'ready',
        extractedText: doc.extracted_text,
        errorMessage: doc.error_message,
        mediaType: doc.media_type ?? null,
      });
    } catch {
      setAttachedDoc(null);
    }
  }, []);

  return { attachedDoc, isUploading, uploadError, attachFile, attachUrl, clearAttachment, loadSessionDocument };
}
