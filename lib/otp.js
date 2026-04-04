import crypto from "node:crypto";

export const OTP_PURPOSE_DONOR_REGISTRATION = "donor-registration";

const BASE_SECRET = process.env.AUTH_SECRET || "resqnet-dev-secret-change-me";
const OTP_SECRET = `${BASE_SECRET}:otp`;
const OTP_CODE_TTL_MINUTES = 10;
const OTP_TOKEN_TTL_MINUTES = 30;

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signData(data) {
  return crypto.createHmac("sha256", OTP_SECRET).update(data).digest("base64url");
}

function secureEqual(valueA, valueB) {
  const a = Buffer.from(String(valueA || ""), "utf8");
  const b = Buffer.from(String(valueB || ""), "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtpCode({ email, otpCode, purpose = OTP_PURPOSE_DONOR_REGISTRATION }) {
  return signData(`${purpose}:${normalizeEmail(email)}:${String(otpCode || "")}`);
}

export function getOtpCodeExpiryDate() {
  return new Date(Date.now() + OTP_CODE_TTL_MINUTES * 60 * 1000);
}

export function getOtpCodeTtlMinutes() {
  return OTP_CODE_TTL_MINUTES;
}

export function createOtpVerificationToken({ email, purpose = OTP_PURPOSE_DONOR_REGISTRATION }) {
  const normalizedEmail = normalizeEmail(email);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email: normalizedEmail,
    purpose,
    iat: now,
    exp: now + OTP_TOKEN_TTL_MINUTES * 60,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signData(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyOtpVerificationToken({ token, email, purpose = OTP_PURPOSE_DONOR_REGISTRATION }) {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = signData(encodedPayload);
  if (!secureEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      return false;
    }

    const normalizedEmail = normalizeEmail(email);
    return payload.email === normalizedEmail && payload.purpose === purpose;
  } catch {
    return false;
  }
}