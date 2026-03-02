import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { encryptFile, decryptFile, encryptAES } from '../lib/encryption';
import { getConversationKey } from '../lib/keyManager';

async function generateThumbnail(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 200;
      let w = img.width;
      let h = img.height;
      if (w > h) { h = (h / w) * maxSize; w = maxSize; }
      else { w = (w / h) * maxSize; h = maxSize; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export function useFileTransfer(conversationId: string | null, userId: string | undefined) {
  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!conversationId || !userId) return null;

    const key = await getConversationKey(conversationId, userId);
    if (!key) return null;

    const arrayBuffer = await file.arrayBuffer();
    const { encrypted, iv } = await encryptFile(arrayBuffer, key);

    const filePath = `${userId}/${conversationId}/${crypto.randomUUID()}.enc`;
    const { error: uploadError } = await supabase.storage
      .from('messaging-files')
      .upload(filePath, encrypted, { contentType: 'application/octet-stream' });

    if (uploadError) return null;

    const thumbnail = await generateThumbnail(file);

    const { ciphertext: encName, iv: nameIv } = await encryptAES(file.name, key);
    const { ciphertext: encMime, iv: mimeIv } = await encryptAES(file.type, key);

    const metadata = {
      fileIv: iv,
      nameIv,
      mimeIv,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      thumbnail: thumbnail || undefined,
      encryptedFileUrl: filePath,
    };

    const { ciphertext, iv: msgIv } = await encryptAES(
      `[File: ${file.name}]`,
      key
    );

    const { data: msg } = await supabase
      .from('messaging_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        encrypted_content: ciphertext,
        iv: msgIv,
        message_type: 'file',
        metadata,
      })
      .select()
      .single();

    if (!msg) return null;

    await supabase.from('messaging_file_transfers').insert({
      message_id: msg.id,
      sender_id: userId,
      encrypted_file_url: filePath,
      file_name_encrypted: encName,
      file_size_bytes: file.size,
      mime_type_encrypted: encMime,
      thumbnail_url: thumbnail,
      status: 'complete',
    });

    await supabase
      .from('messaging_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return msg.id;
  }, [conversationId, userId]);

  const downloadFile = useCallback(async (messageId: string, metadata: { fileIv?: string; fileName?: string; mimeType?: string; encryptedFileUrl?: string }) => {
    if (!conversationId || !userId || !metadata.fileIv) return;

    try {
      const key = await getConversationKey(conversationId, userId);
      if (!key) return;

      let fileUrl = metadata.encryptedFileUrl;

      if (!fileUrl) {
        const { data: transfer } = await supabase
          .from('messaging_file_transfers')
          .select('encrypted_file_url')
          .eq('message_id', messageId)
          .maybeSingle();

        fileUrl = transfer?.encrypted_file_url;
      }

      if (!fileUrl) return;

      const { data, error } = await supabase.storage
        .from('messaging-files')
        .download(fileUrl);

      if (error || !data) return;

      const arrayBuffer = await data.arrayBuffer();
      const decrypted = await decryptFile(arrayBuffer, metadata.fileIv, key);
      const blob = new Blob([decrypted], { type: metadata.mimeType || 'application/octet-stream' });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = metadata.fileName || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }, [conversationId, userId]);

  return { uploadFile, downloadFile };
}
