import { NextResponse } from "next/server";
import { getOtpCodesCollection } from "@/lib/mongodb";
import {
  createOtpVerificationToken,
  hashOtpCode,
  isValidEmail,
  normalizeEmail,
  OTP_PURPOSE_DONOR_REGISTRATION,
} from "@/lib/otp";

const MAX_VERIFY_ATTEMPTS = 5;

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const otpCode = String(body.otpCode || "").trim();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ message: "Please provide a valid email address" }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ message: "OTP must be 6 digits" }, { status: 400 });
    }

    const otpCodes = await getOtpCodesCollection();
    const otpDoc = await otpCodes.findOne(
      {
        email,
        purpose: OTP_PURPOSE_DONOR_REGISTRATION,
        expiresAt: { $gt: new Date() },
      },
      { sort: { createdAt: -1 } }
    );

    if (!otpDoc) {
      return NextResponse.json({ message: "OTP expired. Please request a new code." }, { status: 400 });
    }

    if ((otpDoc.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
      return NextResponse.json({ message: "Too many invalid attempts. Request a new OTP." }, { status: 429 });
    }

    const expectedHash = hashOtpCode({
      email,
      otpCode,
      purpose: OTP_PURPOSE_DONOR_REGISTRATION,
    });

    if (expectedHash !== otpDoc.codeHash) {
      await otpCodes.updateOne({ _id: otpDoc._id }, { $inc: { attempts: 1 } });
      return NextResponse.json({ message: "Invalid OTP" }, { status: 400 });
    }

    await otpCodes.updateOne(
      { _id: otpDoc._id },
      {
        $set: {
          verifiedAt: new Date(),
        },
      }
    );

    const otpVerificationToken = createOtpVerificationToken({
      email,
      purpose: OTP_PURPOSE_DONOR_REGISTRATION,
    });

    return NextResponse.json({
      message: "OTP verified successfully",
      otpVerificationToken,
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to verify OTP", error: error.message }, { status: 500 });
  }
}