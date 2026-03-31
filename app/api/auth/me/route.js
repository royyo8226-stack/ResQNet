import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getUsersCollection } from "@/lib/mongodb";
import { getSessionFromRequest, sanitizeUser } from "@/lib/auth";

export async function GET(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!ObjectId.isValid(session.sub)) {
      return NextResponse.json({ message: "Invalid session" }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ _id: new ObjectId(session.sub) });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch current user", error: error.message }, { status: 500 });
  }
}
