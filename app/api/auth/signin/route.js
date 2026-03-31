import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/mongodb";
import { hashPassword, sanitizeUser, setSessionCookie, verifyPassword } from "@/lib/auth";

async function ensureEnvAdmin(users, email, password) {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || "");

  if (!adminEmail || !adminPassword) {
    return null;
  }

  if (email !== adminEmail || password !== adminPassword) {
    return null;
  }

  const existing = await users.findOne({ email: adminEmail });
  if (existing) {
    if (existing.role !== "admin") {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            role: "admin",
            updatedAt: new Date(),
          },
        }
      );
      return { ...existing, role: "admin" };
    }
    return existing;
  }

  const adminDoc = {
    fullName: "ResQNet Admin",
    email: adminEmail,
    phoneNumber: "",
    passwordHash: hashPassword(adminPassword),
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await users.insertOne(adminDoc);
  return { ...adminDoc, _id: result.insertedId };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    const users = await getUsersCollection();

    let user = await users.findOne({ email });
    if (!user) {
      user = await ensureEnvAdmin(users, email, password);
    }

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    const validPassword = verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }

    if (process.env.NODE_ENV !== "production" && user.role !== "admin") {
      const adminCount = await users.countDocuments({ role: { $in: ["admin", "Admin"] } });
      if (adminCount === 0) {
        await users.updateOne(
          { _id: user._id },
          {
            $set: {
              role: "admin",
              updatedAt: new Date(),
            },
          }
        );
        user = { ...user, role: "admin" };
      }
    }

    await users.updateOne({ _id: user._id }, { $set: { updatedAt: new Date() } });

    const safeUser = sanitizeUser(user);
    const response = NextResponse.json({
      message: "Signed in successfully",
      user: safeUser,
    });

    setSessionCookie(response, safeUser);
    return response;
  } catch (error) {
    return NextResponse.json({ message: "Signin failed", error: error.message }, { status: 500 });
  }
}
