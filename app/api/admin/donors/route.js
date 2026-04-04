import { NextResponse } from "next/server";
import { getDonorsCollection } from "@/lib/mongodb";
import { getSessionFromRequest } from "@/lib/auth";

const STATUS_ALIASES = {
  pending: ["pending", "Pending"],
  verified: ["verified", "Verified"],
  rejected: ["rejected", "Rejected"],
};

function normalizeStatus(status) {
  return String(status || "pending").toLowerCase();
}

function statusValues(status) {
  return STATUS_ALIASES[normalizeStatus(status)] || [normalizeStatus(status)];
}

function normalizeResourceType(donor) {
  const value = String(donor.resourceType || "").trim();
  if (value) return value;
  return donor.bloodGroup ? "Blood" : "Medical Support";
}

export async function GET(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Please sign in" }, { status: 401 });
    }

    if (session.role !== "admin") {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = normalizeStatus(searchParams.get("status") || "all");

    const query =
      status && status !== "all"
        ? { status: { $in: statusValues(status) } }
        : {};

    query.$and = query.$and || [];
    query.$and.push({
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    });

    const donorsCollection = await getDonorsCollection();
    const donors = await donorsCollection.find(query).sort({ createdAt: -1 }).toArray();

    const normalized = donors.map((donor) => ({
      id: donor._id.toString(),
      fullName: donor.fullName,
      phoneNumber: donor.phoneNumber,
      whatsappNumber: donor.whatsappNumber,
      gender: donor.gender,
      bloodGroup: donor.bloodGroup,
      donorType: donor.donorType,
      resourceType: normalizeResourceType(donor),
      resourceNotes: donor.resourceNotes || "",
      address: donor.address,
      pincode: donor.pincode,
      availableNow: donor.availableNow,
      preferredContact: donor.preferredContact,
      status: normalizeStatus(donor.status),
      createdAt: donor.createdAt,
      verifiedAt: donor.verifiedAt || null,
      lastActiveAt: donor.lastActiveAt || donor.createdAt,
      expiresAt: donor.expiresAt || null,
      location: {
        lat: donor.location?.coordinates?.[1] ?? null,
        lng: donor.location?.coordinates?.[0] ?? null,
      },
    }));

    return NextResponse.json({ donors: normalized });
  } catch (error) {
    return NextResponse.json({ message: "Failed to load admin donors", error: error.message }, { status: 500 });
  }
}
