import {
  generateRSAKeyPair,
  exportPublicKey,
  exportPrivateKey,
  importPrivateKey,
  importPublicKey,
  generateAESKey,
  wrapAESKey,
  unwrapAESKey,
  exportAESKey,
  importAESKey,
} from './encryption';
import { supabase } from './supabase';

const DB_NAME = 'n4-e2e-keys';
const DB_VERSION = 1;
const IDENTITY_STORE = 'identity';
const CONV_KEY_STORE = 'conversation-keys';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDENTITY_STORE)) {
        db.createObjectStore(IDENTITY_STORE, { keyPath: 'userId' });
      }
      if (!db.objectStoreNames.contains(CONV_KEY_STORE)) {
        db.createObjectStore(CONV_KEY_STORE, { keyPath: 'conversationId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, store: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

interface StoredIdentity {
  userId: string;
  publicKeyB64: string;
  privateKeyB64: string;
}

interface StoredConvKey {
  conversationId: string;
  aesKeyB64: string;
}

export async function getOrCreateIdentity(userId: string): Promise<{ publicKey: string; privateKey: CryptoKey }> {
  const db = await openDB();
  const stored = await idbGet<StoredIdentity>(db, IDENTITY_STORE, userId);

  if (stored) {
    const privateKey = await importPrivateKey(stored.privateKeyB64);
    return { publicKey: stored.publicKeyB64, privateKey };
  }

  const keyPair = await generateRSAKeyPair();
  const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
  const privateKeyB64 = await exportPrivateKey(keyPair.privateKey);

  await idbPut(db, IDENTITY_STORE, {
    userId,
    publicKeyB64,
    privateKeyB64,
  });

  await supabase.from('messaging_key_bundles').upsert(
    {
      user_id: userId,
      identity_public_key: publicKeyB64,
      signed_pre_key: publicKeyB64,
      one_time_pre_keys: [],
    },
    { onConflict: 'user_id' }
  );

  return { publicKey: publicKeyB64, privateKey: keyPair.privateKey };
}

export async function getConversationKey(
  conversationId: string,
  userId: string
): Promise<CryptoKey | null> {
  const db = await openDB();
  const stored = await idbGet<StoredConvKey>(db, CONV_KEY_STORE, conversationId);
  if (stored) {
    return importAESKey(stored.aesKeyB64);
  }

  const { publicKey: _pk, privateKey } = await getOrCreateIdentity(userId);

  const { data: participant } = await supabase
    .from('messaging_participants')
    .select('encrypted_conversation_key')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!participant?.encrypted_conversation_key) return null;

  try {
    const aesKey = await unwrapAESKey(participant.encrypted_conversation_key, privateKey);
    const aesKeyB64 = await exportAESKey(aesKey);
    await idbPut(db, CONV_KEY_STORE, { conversationId, aesKeyB64 });
    return aesKey;
  } catch (e) {
    console.error('[keyManager] Failed to unwrap conversation key (key mismatch or corruption):', e);
    return null;
  }
}

export async function createConversationKey(
  conversationId: string,
  participantUserIds: string[]
): Promise<CryptoKey> {
  const aesKey = await generateAESKey();
  const aesKeyB64 = await exportAESKey(aesKey);

  const { data: bundles } = await supabase
    .from('messaging_key_bundles')
    .select('user_id, identity_public_key')
    .in('user_id', participantUserIds);

  if (bundles) {
    for (const bundle of bundles) {
      try {
        const pubKey = await importPublicKey(bundle.identity_public_key);
        const wrapped = await wrapAESKey(aesKey, pubKey);
        await supabase
          .from('messaging_participants')
          .update({ encrypted_conversation_key: wrapped })
          .eq('conversation_id', conversationId)
          .eq('user_id', bundle.user_id);
      } catch {
        // key distribution to this participant will be retried later
      }
    }
  }

  const db = await openDB();
  await idbPut(db, CONV_KEY_STORE, { conversationId, aesKeyB64 });

  return aesKey;
}

export async function distributeKeyToNewParticipant(
  conversationId: string,
  newUserId: string,
  existingUserId: string
): Promise<void> {
  const aesKey = await getConversationKey(conversationId, existingUserId);
  if (!aesKey) return;

  const { data: bundle } = await supabase
    .from('messaging_key_bundles')
    .select('identity_public_key')
    .eq('user_id', newUserId)
    .maybeSingle();

  if (!bundle) return;

  const pubKey = await importPublicKey(bundle.identity_public_key);
  const wrapped = await wrapAESKey(aesKey, pubKey);

  await supabase
    .from('messaging_participants')
    .update({ encrypted_conversation_key: wrapped })
    .eq('conversation_id', conversationId)
    .eq('user_id', newUserId);
}
