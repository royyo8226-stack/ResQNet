import { NextResponse } from "next/server";
import { getDonorsCollection } from "@/lib/mongodb";
import { getDistanceKm } from "@/lib/utils";
import {
  OTP_PURPOSE_DONOR_REGISTRATION,
  isValidEmail,
  normalizeEmail,
  verifyOtpVerificationToken,
} from "@/lib/otp";

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

function statusQuery(status) {
  const values = statusValues(status);
  return values.length === 1 ? values[0] : { $in: values };
}

function statusWeight(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "verified") return 0;
  if (normalized === "pending") return 1;
  return 2;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveCoordinates(donor) {
  let lat = toFiniteNumber(donor.location?.coordinates?.[1] ?? donor.latitude);
  let lng = toFiniteNumber(donor.location?.coordinates?.[0] ?? donor.longitude);

  if (lat != null && lng != null && Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    [lat, lng] = [lng, lat];
  }

  if (lat == null || lng == null) {
    return { lat: null, lng: null };
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { lat: null, lng: null };
  }

  return { lat, lng };
}

function normalizeResourceType(resourceType, donor) {
  const value = String(resourceType || "").trim();
  if (value) return value;

  return donor?.bloodGroup ? "Blood" : "Medical Support";
}

function normalizeDonor(donor, userLat, userLng) {
  const { lat, lng } = resolveCoordinates(donor);
  const resourceType = normalizeResourceType(donor.resourceType, donor);
  const distanceKm =
    userLat != null && userLng != null && lat != null && lng != null
      ? getDistanceKm(userLat, userLng, lat, lng)
      : null;

  return {
    id: donor._id.toString(),
    fullName: donor.fullName,
    phoneNumber: donor.phoneNumber,
    whatsappNumber: donor.whatsappNumber,
    gender: donor.gender,
    bloodGroup: donor.bloodGroup,
    donorType: donor.donorType,
    resourceType,
    resourceNotes: donor.resourceNotes || "",
    address: donor.address,
    pincode: donor.pincode,
    availableNow: donor.availableNow,
    preferredContact: donor.preferredContact,
    status: normalizeStatus(donor.status),
    verifiedAt: donor.verifiedAt || null,
    createdAt: donor.createdAt,
    lastActiveAt: donor.lastActiveAt || donor.createdAt,
    expiresAt: donor.expiresAt || null,
    location: { lat, lng },
    distanceKm,
  };
}

function parseBool(value) {
  return value === "true";
}

function parseQueryCoordinate(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  return Number(value);
}

function parseExpiryDate(value) {
  if (!value) {
    return null;
  }

  const expiryDate = new Date(value);
  if (!Number.isFinite(expiryDate.getTime())) {
    return null;
  }

  return expiryDate;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bloodGroup = searchParams.get("bloodGroup") || "";
    const resourceType = String(searchParams.get("resourceType") || "Blood").trim();
    const nearMe = parseBool(searchParams.get("nearMe"));
    const verifiedOnly = parseBool(searchParams.get("verifiedOnly"));
    const availableOnly = parseBool(searchParams.get("availableOnly"));
    const urgent = parseBool(searchParams.get("urgent"));
    const maxDistanceKm = Number(searchParams.get("maxDistanceKm") || 0);
    const parsedLat = parseQueryCoordinate(searchParams.get("lat"));
    const parsedLng = parseQueryCoordinate(searchParams.get("lng"));

    const hasCoordinates = Number.isFinite(parsedLat) && Number.isFinite(parsedLng);
    const userLat = hasCoordinates ? parsedLat : null;
    const userLng = hasCoordinates ? parsedLng : null;
    const shouldUseDistance = hasCoordinates && (nearMe || urgent || maxDistanceKm > 0);

    const query = {};
    if (resourceType && resourceType !== "All") {
      if (resourceType === "Blood") {
        query.$or = [{ resourceType: "Blood" }, { resourceType: { $exists: false } }];
      } else {
        query.resourceType = resourceType;
      }
    }

    if (resourceType === "Blood" && bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    if (verifiedOnly) query.status = statusQuery("verified");
    if (availableOnly) query.availableNow = true;

    query.$and = query.$and || [];
    query.$and.push({
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
    });

    const donorsCollection = await getDonorsCollection();
    const donors = await donorsCollection.find(query).toArray();

    let formatted = donors.map((donor) => normalizeDonor(donor, userLat, userLng));

    if (shouldUseDistance) {
      formatted = formatted.filter((donor) => donor.distanceKm != null);
    }

    if (shouldUseDistance && maxDistanceKm > 0) {
      formatted = formatted.filter((donor) => donor.distanceKm != null && donor.distanceKm <= maxDistanceKm);
    }

    if (shouldUseDistance && urgent) {
      formatted.sort((a, b) => {
        const availabilityWeightA = a.availableNow ? 0 : 1;
        const availabilityWeightB = b.availableNow ? 0 : 1;
        if (availabilityWeightA !== availabilityWeightB) {
          return availabilityWeightA - availabilityWeightB;
        }

        const verifiedWeightA = statusWeight(a.status);
        const verifiedWeightB = statusWeight(b.status);
        if (verifiedWeightA !== verifiedWeightB) {
          return verifiedWeightA - verifiedWeightB;
        }

        return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
      });
    } else if (shouldUseDistance) {
      formatted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    } else {
      formatted.sort((a, b) => {
        const availabilityWeightA = a.availableNow ? 0 : 1;
        const availabilityWeightB = b.availableNow ? 0 : 1;
        if (availabilityWeightA !== availabilityWeightB) {
          return availabilityWeightA - availabilityWeightB;
        }

        const statusOrder = statusWeight(a.status) - statusWeight(b.status);
        if (statusOrder !== 0) {
          return statusOrder;
        }

        const lastActiveA = new Date(a.lastActiveAt || a.createdAt).getTime();
        const lastActiveB = new Date(b.lastActiveAt || b.createdAt).getTime();
        return lastActiveB - lastActiveA;
      });
    }

    const topMatchId = formatted.length > 0 ? formatted[0].id : null;

    return NextResponse.json({ donors: formatted, topMatchId });
  } catch (error) {
    return NextResponse.json({ message: "Failed to load donors", error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const resourceType = normalizeResourceType(body.resourceType, body);
    const isBloodResource = resourceType === "Blood";

    const requiredFields = [
      "fullName",
      "email",
      "phoneNumber",
      "whatsappNumber",
      "gender",
      "donorType",
      "address",
      "pincode",
      "availableNow",
      "preferredContact",
      "latitude",
      "longitude",
      "expiresAt",
      "otpVerificationToken",
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json({ message: `Missing field: ${field}` }, { status: 400 });
      }
    }

    if (isBloodResource && !body.bloodGroup) {
      return NextResponse.json({ message: "Missing field: bloodGroup" }, { status: 400 });
    }

    if (!isBloodResource && String(body.resourceNotes || "").trim().length < 5) {
      return NextResponse.json({ message: "Please add resource details" }, { status: 400 });
    }

    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "Invalid email" }, { status: 400 });
    }

    const otpVerificationToken = String(body.otpVerificationToken || "");
    const otpVerified = verifyOtpVerificationToken({
      token: otpVerificationToken,
      email,
      purpose: OTP_PURPOSE_DONOR_REGISTRATION,
    });

    if (!otpVerified) {
      return NextResponse.json({ message: "Email OTP verification failed" }, { status: 403 });
    }

    const expiresAt = parseExpiryDate(body.expiresAt);
    if (!expiresAt) {
      return NextResponse.json({ message: "Invalid expiry date" }, { status: 400 });
    }

    if (expiresAt <= new Date()) {
      return NextResponse.json({ message: "Expiry date must be in the future" }, { status: 400 });
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ message: "Invalid coordinates" }, { status: 400 });
    }

    const donorsCollection = await getDonorsCollection();

    const donor = {
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      whatsappNumber: body.whatsappNumber,
      email,
      gender: body.gender,
      bloodGroup: isBloodResource ? body.bloodGroup : "",
      donorType: body.donorType,
      resourceType,
      resourceNotes: String(body.resourceNotes || "").trim(),
      address: body.address,
      pincode: body.pincode,
      availableNow: Boolean(body.availableNow),
      preferredContact: body.preferredContact,
      status: "pending",
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
    };

    const result = await donorsCollection.insertOne(donor);

    return NextResponse.json(
      {
        message: "Registration submitted for verification",
        status: "Pending",
        donorId: result.insertedId.toString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ message: "Registration failed", error: error.message }, { status: 500 });
  }
}
