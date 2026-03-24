import CryptoJS from 'crypto-js';
import * as Random from 'expo-random';

const ITERATIONS = 120000;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
}

export function isValidPin(pin: string) {
  return /^\d{6,12}$/.test(pin.trim());
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateSalt(length = 16) {
  const bytes = await Random.getRandomBytesAsync(length);
  return bytesToHex(bytes);
}

export function deriveKey(secret: string, salt: string) {
  return CryptoJS.PBKDF2(secret, salt, {
    keySize: 256 / 32,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  }).toString(CryptoJS.enc.Hex);
}

export function hashPin(pin: string, salt: string) {
  return deriveKey(pin, salt);
}

export function encryptWithPin(value: string, pin: string, salt: string) {
  const key = deriveKey(pin, salt);
  return CryptoJS.AES.encrypt(value, key).toString();
}

export function decryptWithPin(ciphertext: string, pin: string, salt: string) {
  const key = deriveKey(pin, salt);
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const output = bytes.toString(CryptoJS.enc.Utf8);
  return output || null;
}
