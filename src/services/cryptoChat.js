/**
 * Modul End-to-End Encryption (E2EE) untuk Chat LMS Ernawaty
 * Menggunakan Web Crypto API bawaan browser:
 * - Algoritma: AES-GCM 256-bit
 * - Key Derivation: PBKDF2 (SHA-256, 100.000 iterasi)
 * - Format Ciphertext: "E2E:v1:<base64-iv>:<base64-ciphertext>"
 */

const SALT_PREFIX = "LMS_ERNAWATY_E2EE_PEPPER_2026_"
const PREFIX = "E2E:v1:"

// Cache CryptoKey di memori agar cepat dan tidak perlu derivasi berulang
const keyCache = new Map()

/**
 * Mengubah string menjadi ArrayBuffer
 */
function strToBuf(str) {
  return new TextEncoder().encode(str)
}

/**
 * Mengubah ArrayBuffer menjadi string
 */
function bufToStr(buf) {
  return new TextDecoder().decode(buf)
}

/**
 * Encode ArrayBuffer / Uint8Array ke Base64 URL-safe
 */
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Decode Base64 ke Uint8Array
 */
function base64ToBuf(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Melakukan derivasi CryptoKey AES-GCM 256-bit dari shared passphrase
 */
async function deriveAesKey(rawSecret) {
  if (keyCache.has(rawSecret)) {
    return keyCache.get(rawSecret)
  }

  // 1. Import raw string sebagai base key
  const baseKey = await crypto.subtle.importKey(
    "raw",
    strToBuf(rawSecret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  )

  // 2. Derivasi ke AES-GCM 256-bit
  const salt = strToBuf(SALT_PREFIX + rawSecret)
  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )

  keyCache.set(rawSecret, aesKey)
  return aesKey
}

/**
 * Mengenkripsi teks pesan biasa menjadi ciphertext E2EE
 * @param {string} plainText Teks pesan asli
 * @param {string} secretKey Kunci rahasia bersama (chatId atau kelasId)
 * @returns {Promise<string>} Ciphertext string "E2E:v1:<iv>:<ciphertext>"
 */
export async function encryptChatMessage(plainText, secretKey) {
  if (!plainText || !secretKey) return plainText

  try {
    const key = await deriveAesKey(secretKey)
    // Buat Initial Vector (IV) acak 12-byte per pesan
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const encoded = strToBuf(plainText)
    const encrypted = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      encoded
    )

    const ivB64 = bufToBase64(iv)
    const cipherB64 = bufToBase64(encrypted)

    return `${PREFIX}${ivB64}:${cipherB64}`
  } catch (err) {
    console.warn("Gagal mengenkripsi pesan, fallback ke teks asli:", err)
    return plainText
  }
}

/**
 * Mendekripsi ciphertext E2EE kembali ke teks asli
 * Mendukung pesan lama (backward-compatible: jika bukan format E2E, kembalikan langsung)
 * @param {string} cipherText Teks terenkripsi atau pesan lama
 * @param {string} secretKey Kunci rahasia bersama (chatId atau kelasId)
 * @returns {Promise<string>} Teks asli
 */
export async function decryptChatMessage(cipherText, secretKey) {
  if (!cipherText || typeof cipherText !== "string") return cipherText

  // Jika bukan pesan terenkripsi E2EE, berarti pesan lama
  if (!cipherText.startsWith(PREFIX)) {
    return cipherText
  }

  try {
    const key = await deriveAesKey(secretKey)
    const rawParts = cipherText.slice(PREFIX.length).split(":")
    if (rawParts.length !== 2) return cipherText

    const iv = base64ToBuf(rawParts[0])
    const cipherBytes = base64ToBuf(rawParts[1])

    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
      },
      key,
      cipherBytes
    )

    return bufToStr(decrypted)
  } catch (err) {
    console.warn("Gagal mendekripsi pesan E2E:", err)
    return "[Pesan Terenkripsi Tidak Dapat Didekripsi]"
  }
}
