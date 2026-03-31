import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDonorsCollection } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Please sign in" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const { action } = await request.json();
    const { id: donorId } = await params;

    if (!ObjectId.isValid(donorId)) {
      return NextResponse.json({ message: "Invalid donor ID" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Action must be approve or reject" }, { status: 400 });
    }

    const status = action === "approve" ? "verified" : "rejected";

    const donorsCollection = await getDonorsCollection();
    const updatedDonor = await donorsCollection.findOneAndUpdate(
      { _id: new ObjectId(donorId) },
      {
        $set: {
          status,
          verifiedAt: action === "approve" ? new Date() : null,
          lastActiveAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );

    if (!updatedDonor) {
      return NextResponse.json({ message: "Donor not found" }, { status: 404 });
    }

    return NextResponse.json({ message: `Donor ${status}`, donor: updatedDonor });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update donor status", error: error.message }, { status: 500 });
  }
}
