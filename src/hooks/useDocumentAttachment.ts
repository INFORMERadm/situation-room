import { useState, useCallback } from 'react';
import { uploadChatDocument, getSessionDocument } from '../lib/api';
import type { ChatDocument } from '../lib/api';
import { supabase } from '../lib/supabase';

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
]);

const ALLOWED_EXTS = new Set(['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md']);

export interface AttachedDoc {
  documentId: string;
  filename: string;
  charCount: number;
  status: 'processing' | 'ready' | 'error';
  extractedText: string;
  errorMessage: string | null;
}

export interface UseDocumentAttachmentReturn {
  attachedDoc: AttachedDoc | null;
  isUploading: boolean;
  uploadError: string | null;
  attachFile: (file: File, sessionId: string) => Promise<void>;
  clearAttachment: () => void;
  loadSessionDocument: (sessionId: string) => Promise<void>;
}

export function useDocumentAttachment(): UseDocumentAttachmentReturn {
  const [attachedDoc, setAttachedDoc] = useState<AttachedDoc | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const attachFile = useCallback(async (file: File, sessionId: string) => {
    setUploadError(null);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTS.has(ext)) {
      setUploadError('Unsupported file type. Please use PDF, DOCX, XLSX, PPTX, TXT, or MD.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setUploadError('File exceeds 100 MB limit.');
      return;
    }

    setIsUploading(true);
    setAttachedDoc({
      documentId: '',
      filename: file.name,
      charCount: 0,
      status: 'processing',
      extractedText: '',
      errorMessage: null,
    });

    try {
      const result = await uploadChatDocument(file, sessionId);

      if (result.status === 'error') {
        setAttachedDoc(null);
        setUploadError(result.errorMessage || 'Failed to extract text from file.');
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
      });
    } catch (e) {
      setAttachedDoc(null);
      setUploadError((e as Error).message || 'Upload failed.');
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
      });
    } catch {
      setAttachedDoc(null);
    }
  }, []);

  return { attachedDoc, isUploading, uploadError, attachFile, clearAttachment, loadSessionDocument };
}
