export interface EncryptedBackupEnvelope {
  application: 'DewTask'
  backupVersion: 2
  encrypted: true
  exportedAt: string
  kdf: {
    algorithm: 'PBKDF2'
    hash: 'SHA-256'
    iterations: number
    salt: string
  }
  cipher: {
    algorithm: 'AES-GCM'
    iv: string
  }
  payload: string
}

const DEFAULT_ITERATIONS = 600_000
const MIN_ITERATIONS = 100_000
const MAX_ITERATIONS = 2_000_000
const SALT_BYTES = 16
const IV_BYTES = 12

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize)
    chunks.push(String.fromCharCode(...slice))
  }
  return btoa(chunks.join(''))
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveAesKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: KeyUsage[],
): Promise<CryptoKey> {
  if (!window.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.')
  }

  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usage,
  )
}

export async function encryptBackupPayload(
  plaintextJson: string,
  passphrase: string,
): Promise<EncryptedBackupEnvelope> {
  if (!passphrase) {
    throw new Error('A passphrase is required to encrypt the backup.')
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(SALT_BYTES)))
  const iv = window.crypto.getRandomValues(new Uint8Array(new ArrayBuffer(IV_BYTES)))
  const key = await deriveAesKey(passphrase, salt, DEFAULT_ITERATIONS, ['encrypt'])

  const encodedPlaintext = new TextEncoder().encode(plaintextJson)
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedPlaintext,
  )

  return {
    application: 'DewTask',
    backupVersion: 2,
    encrypted: true,
    exportedAt: new Date().toISOString(),
    kdf: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: DEFAULT_ITERATIONS,
      salt: bytesToBase64(salt),
    },
    cipher: {
      algorithm: 'AES-GCM',
      iv: bytesToBase64(iv),
    },
    payload: bytesToBase64(new Uint8Array(ciphertextBuffer)),
  }
}

export async function decryptBackupPayload(
  envelope: EncryptedBackupEnvelope,
  passphrase: string,
): Promise<string> {
  if (!passphrase) {
    throw new Error('Enter the backup passphrase to decrypt this file.')
  }

  const { iterations, salt, algorithm: kdfAlg, hash } = envelope.kdf
  const { algorithm: cipherAlg, iv } = envelope.cipher

  if (kdfAlg !== 'PBKDF2' || hash !== 'SHA-256' || cipherAlg !== 'AES-GCM') {
    throw new Error('Unsupported backup encryption parameters.')
  }

  if (
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < MIN_ITERATIONS ||
    iterations > MAX_ITERATIONS
  ) {
    throw new Error('Invalid key derivation parameters in backup file.')
  }

  try {
    const saltBytes = base64ToBytes(salt)
    const ivBytes = base64ToBytes(iv)
    const ciphertextBytes = base64ToBytes(envelope.payload)

    const key = await deriveAesKey(passphrase, saltBytes, iterations, ['decrypt'])
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ciphertextBytes,
    )

    return new TextDecoder().decode(decryptedBuffer)
  } catch {
    throw new Error('Incorrect passphrase or corrupted backup file.')
  }
}

export function isEncryptedBackupEnvelope(
  value: unknown,
): value is EncryptedBackupEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>

  if (
    candidate.application !== 'DewTask' ||
    candidate.backupVersion !== 2 ||
    candidate.encrypted !== true ||
    typeof candidate.payload !== 'string'
  ) {
    return false
  }

  const kdf = candidate.kdf as Record<string, unknown> | undefined
  const cipher = candidate.cipher as Record<string, unknown> | undefined

  return Boolean(
    kdf &&
      typeof kdf === 'object' &&
      typeof kdf.salt === 'string' &&
      typeof kdf.iterations === 'number' &&
      cipher &&
      typeof cipher === 'object' &&
      typeof cipher.iv === 'string',
  )
}