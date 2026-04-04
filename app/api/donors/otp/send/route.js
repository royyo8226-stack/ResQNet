import { NextResponse } from "next/server";
import { getOtpCodesCollection } from "@/lib/mongodb";
import { sendDonorOtpEmail } from "@/lib/mailer";
import {
  generateOtpCode,
  getOtpCodeExpiryDate,
  getOtpCodeTtlMinutes,
  hashOtpCode,
  isValidEmail,
  normalizeEmail,
  OTP_PURPOSE_DONOR_REGISTRATION,
} from "@/lib/otp";

const MAX_OTP_SENDS_PER_HOUR = 8;

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ message: "Please provide a valid email address" }, { status: 400 });
    }

    const otpCodes = await getOtpCodesCollection();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOtpCount = await otpCodes.countDocuments({
      email,
      purpose: OTP_PURPOSE_DONOR_REGISTRATION,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentOtpCount >= MAX_OTP_SENDS_PER_HOUR) {
      return NextResponse.json(
        { message: "Too many OTP requests. Please try again after some time." },
        { status: 429 }
      );
    }

    const otpCode = generateOtpCode();
    const expiresAt = getOtpCodeExpiryDate();
    const createdAt = new Date();

    const inserted = await otpCodes.insertOne({
      email,
      purpose: OTP_PURPOSE_DONOR_REGISTRATION,
      codeHash: hashOtpCode({ email, otpCode, purpose: OTP_PURPOSE_DONOR_REGISTRATION }),
      createdAt,
      expiresAt,
      attempts: 0,
      verifiedAt: null,
    });

    try {
      await sendDonorOtpEmail({
        toEmail: email,
        otpCode,
        expiresInMinutes: getOtpCodeTtlMinutes(),
      });
    } catch (mailError) {
      await otpCodes.deleteOne({ _id: inserted.insertedId });
      throw mailError;
    }

    return NextResponse.json({
      message: "OTP sent successfully",
      expiresInMinutes: getOtpCodeTtlMinutes(),
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to send OTP", error: error.message }, { status: 500 });
  }
}