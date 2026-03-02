const subtle = globalThis.crypto.subtle;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateAESKey(): Promise<CryptoKey> {
  return subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportAESKey(key: CryptoKey): Promise<string> {
  const raw = await subtle.exportKey('raw', key);
  return toBase64(raw);
}

export async function importAESKey(b64: string): Promise<CryptoKey> {
  const raw = fromBase64(b64);
  return subtle.importKey('raw', raw, { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptAES(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );
  return { ciphertext: toBase64(encrypted), iv: toBase64(iv.buffer) };
}

export async function decryptAES(
  ciphertext: string,
  ivB64: string,
  key: CryptoKey
): Promise<string> {
  const iv = new Uint8Array(fromBase64(ivB64));
  const data = fromBase64(ciphertext);
  const decrypted = await subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

export async function encryptFile(
  file: ArrayBuffer,
  key: CryptoKey
): Promise<{ encrypted: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await subtle.encrypt({ name: 'AES-GCM', iv }, key, file);
  return { encrypted, iv: toBase64(iv.buffer) };
}

export async function decryptFile(
  encrypted: ArrayBuffer,
  ivB64: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const iv = new Uint8Array(fromBase64(ivB64));
  return subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
}

export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['wrapKey', 'unwrapKey']
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const spki = await subtle.exportKey('spki', key);
  return toBase64(spki);
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const spki = fromBase64(b64);
  return subtle.importKey('spki', spki, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, [
    'wrapKey',
  ]);
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const pkcs8 = await subtle.exportKey('pkcs8', key);
  return toBase64(pkcs8);
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  const pkcs8 = fromBase64(b64);
  return subtle.importKey(
    'pkcs8',
    pkcs8,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['unwrapKey']
  );
}

export async function wrapAESKey(
  aesKey: CryptoKey,
  rsaPublicKey: CryptoKey
): Promise<string> {
  const wrapped = await subtle.wrapKey('raw', aesKey, rsaPublicKey, {
    name: 'RSA-OAEP',
  });
  return toBase64(wrapped);
}

export async function unwrapAESKey(
  wrappedB64: string,
  rsaPrivateKey: CryptoKey
): Promise<CryptoKey> {
  const wrapped = fromBase64(wrappedB64);
  return subtle.unwrapKey(
    'raw',
    wrapped,
    rsaPrivateKey,
    { name: 'RSA-OAEP' },
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export { toBase64, fromBase64 };
