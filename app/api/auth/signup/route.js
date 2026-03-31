import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { hashPassword, sanitizeUser, setSessionCookie } from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phoneNumber = String(body.phoneNumber || "").trim();
    const password = String(body.password || "");

    if (!fullName || !email || !phoneNumber || !password) {
      return NextResponse.json({ message: "All signup fields are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    const users = await getUsersCollection();
    const existing = await users.findOne({ email });
    if (existing) {
      return NextResponse.json({ message: "User already exists. Please sign in." }, { status: 409 });
    }

    const configuredAdminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const isConfiguredAdmin = configuredAdminEmail && email === configuredAdminEmail;

    let role = "user";
    if (isConfiguredAdmin) {
      role = "admin";
    } else if (process.env.NODE_ENV !== "production") {
      const adminCount = await users.countDocuments({ role: { $in: ["admin", "Admin"] } });
      if (adminCount === 0) {
        role = "admin";
      }
    }

    const doc = {
      fullName,
      email,
      phoneNumber,
      passwordHash: hashPassword(password),
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(doc);
    const createdUser = { ...doc, _id: result.insertedId };

    const response = NextResponse.json({
      message: "Account created successfully",
      user: sanitizeUser(createdUser),
    });

    setSessionCookie(response, sanitizeUser(createdUser));
    return response;
  } catch (error) {
    return NextResponse.json({ message: "Signup failed", error: error.message }, { status: 500 });
  }
}
