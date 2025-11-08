"use client";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type SeedStrength = {
  score: number;
  label: "Very Weak" | "Weak" | "Okay" | "Strong" | "Excellent";
  suggestions: string[];
};

export const MIN_SEED_LENGTH = 12;
export const MIN_SEED_SCORE = 3;

export async function encryptMessage(
  message: string,
  seed: string
): Promise<{ ciphertext: string; iv: string; salt: string }> {
  const saltBytes = getRandomValues(16);
  const key = await deriveKey(seed, saltBytes.buffer);
  const ivBytes = getRandomValues(12);

  const ciphertext = await subtle().encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encoder.encode(message)
  );

  return {
    ciphertext: bufferToBase64(ciphertext),
    iv: bufferToBase64(ivBytes.buffer),
    salt: bufferToBase64(saltBytes.buffer),
  };
}

export async function decryptMessage(
  ciphertext: string,
  seed: string,
  salt: string,
  iv: string
): Promise<string> {
  const saltBytes = base64ToBytes(salt);
  const key = await deriveKey(seed, saltBytes.buffer);
  const ivBytes = base64ToBytes(iv);
  const ciphertextBytes = base64ToBytes(ciphertext);

  const plaintext = await subtle().decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    ciphertextBytes
  );

  return decoder.decode(plaintext);
}

export function assessSeedStrength(seed: string): SeedStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (seed.length >= MIN_SEED_LENGTH) {
    score += 1;
  } else {
    suggestions.push(`Use at least ${MIN_SEED_LENGTH} characters.`);
  }

  const hasUpper = /[A-Z]/.test(seed);
  const hasLower = /[a-z]/.test(seed);
  const hasNumber = /[0-9]/.test(seed);
  const hasSymbol = /[^a-zA-Z0-9\s]/.test(seed);

  const classes = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean)
    .length;

  score += Math.max(0, classes - 1);

  if (!hasUpper) suggestions.push("Add uppercase letters.");
  if (!hasLower) suggestions.push("Add lowercase letters.");
  if (!hasNumber) suggestions.push("Include numbers.");
  if (!hasSymbol) suggestions.push("Sprinkle in special characters.");

  if (seed.length >= 24) score += 1;
  if (!/\s/.test(seed) || seed.trim().length >= MIN_SEED_LENGTH) {
    score += 1;
  } else {
    suggestions.push("Avoid leading or trailing spaces.");
  }

  if (score >= 4) {
    return { score: 4, label: "Excellent", suggestions: [] };
  }
  if (score === 3) {
    return { score, label: "Strong", suggestions };
  }
  if (score === 2) {
    return { score, label: "Okay", suggestions };
  }
  if (score === 1) {
    return { score, label: "Weak", suggestions };
  }
  return { score: 0, label: "Very Weak", suggestions };
}

export function isCryptoAvailable() {
  return typeof globalThis !== "undefined" && !!globalThis.crypto?.subtle;
}

function subtle() {
  if (!isCryptoAvailable()) {
    throw new Error("Web Crypto API is not available in this environment.");
  }
  return globalThis.crypto.subtle;
}

function getRandomValues(length: number) {
  if (!isCryptoAvailable()) {
    throw new Error("Cannot generate random values without Web Crypto API.");
  }
  const array = new Uint8Array(length);
  globalThis.crypto.getRandomValues(array);
  return array;
}

async function deriveKey(seed: string, salt: ArrayBuffer) {
  const keyMaterial = await subtle().importKey(
    "raw",
    encoder.encode(seed),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return subtle().deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 150_000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

