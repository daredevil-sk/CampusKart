const crypto = require("crypto");

const algorithm = "aes-256-cbc";

// Use JWT_SECRET as fallback if CHAT_SECRET_KEY not defined
const secretKey = process.env.CHAT_SECRET_KEY || process.env.JWT_SECRET;

if (!secretKey) {
  throw new Error('CHAT_SECRET_KEY or JWT_SECRET environment variable must be set');
}

const key = crypto
  .createHash("sha256")
  .update(secretKey)
  .digest();

function encryptText(text) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
  };
}

function decryptText(encryptedData, ivHex) {
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encryptedBuffer = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  return {
    encryptedBuffer,
    iv: iv.toString("hex"),
  };
}

function decryptBuffer(encryptedBuffer, ivHex) {
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  return Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);
}

module.exports = {
  encryptText,
  decryptText,
  encryptBuffer,
  decryptBuffer,
};