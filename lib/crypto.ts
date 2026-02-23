import crypto from "crypto";

const ENCRYPTED_PREFIX = "enc:v1:";

function getEncryptionKey() {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY?.trim();

  if (rawKey) {
    if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
      return Buffer.from(rawKey, "hex");
    }

    const asBase64 = Buffer.from(rawKey, "base64");
    if (asBase64.length === 32) {
      return asBase64;
    }

    return crypto.createHash("sha256").update(rawKey, "utf8").digest();
  }

  if (process.env.NEXTAUTH_SECRET) {
    return crypto.createHash("sha256").update(process.env.NEXTAUTH_SECRET, "utf8").digest();
  }

  throw new Error("TOKEN_ENCRYPTION_KEY or NEXTAUTH_SECRET must be configured.");
}

export function encryptSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith(ENCRYPTED_PREFIX)) {
    return value;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}.${tag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(value?: string | null) {
  if (!value) {
    return null;
  }

  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Backward compatibility for already-stored legacy plain tokens.
    return value;
  }

  const encoded = value.slice(ENCRYPTED_PREFIX.length);
  const [ivText, tagText, encryptedText] = encoded.split(".");

  if (!ivText || !tagText || !encryptedText) {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivText, "base64");
    const tag = Buffer.from(tagText, "base64");
    const encrypted = Buffer.from(encryptedText, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Failed to decrypt token:", error);
    return null;
  }
}
