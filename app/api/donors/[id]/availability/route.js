import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDonorsCollection } from "@/lib/mongodb";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { id: donorId } = await params;

    if (!ObjectId.isValid(donorId)) {
      return NextResponse.json({ message: "Invalid donor ID" }, { status: 400 });
    }

    const donorsCollection = await getDonorsCollection();
    const update = {
      availableNow: Boolean(body.availableNow),
      lastActiveAt: new Date(),
    };

    const result = await donorsCollection.findOneAndUpdate(
      { _id: new ObjectId(donorId) },
      { $set: update },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ message: "Donor not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Availability updated", donor: result });
  } catch (error) {
    return NextResponse.json({ message: "Failed to update availability", error: error.message }, { status: 500 });
  }
}
