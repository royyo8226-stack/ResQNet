import { NextResponse } from "next/server";
import { getDonorsCollection } from "@/lib/mongodb";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const hpLocations = [
  { area: "IGMC Shimla, Himachal Pradesh", pincode: "171001", lat: 31.1062, lng: 77.1737 },
  { area: "Near NIT Hamirpur, Himachal Pradesh", pincode: "177005", lat: 31.7087, lng: 76.5279 },
  { area: "Near IIT Mandi, Himachal Pradesh", pincode: "175075", lat: 31.7768, lng: 76.9867 },
  { area: "Near Tanda Medical College, Kangra", pincode: "176001", lat: 32.1005, lng: 76.2708 },
  { area: "Near Solan District Hospital", pincode: "173212", lat: 30.9092, lng: 77.0990 },
  { area: "Near Kullu Regional Hospital", pincode: "175101", lat: 31.9580, lng: 77.1094 },
  { area: "Near Chamba Medical Support Center", pincode: "176310", lat: 32.5535, lng: 76.1258 },
  { area: "Near Una Civil Hospital", pincode: "174303", lat: 31.4694, lng: 76.2708 },
  { area: "Near Bilaspur Health Point", pincode: "174001", lat: 31.3314, lng: 76.7566 },
  { area: "Near Dharamshala Emergency Wing", pincode: "176215", lat: 32.2190, lng: 76.3234 },
];

const punjabLocations = [
  { area: "Near GNA University Gate 1, Phagwara", pincode: "144401", lat: 31.2458, lng: 75.7038 },
  { area: "Near GNA University East Block", pincode: "144401", lat: 31.2471, lng: 75.7060 },
  { area: "Near GNA University Main Road", pincode: "144401", lat: 31.2442, lng: 75.7009 },
  { area: "Near GNA University Medical Point", pincode: "144401", lat: 31.2486, lng: 75.7082 },
  { area: "Near GNA University South Access", pincode: "144401", lat: 31.2434, lng: 75.6994 },
  { area: "Near SBBS University Main Campus", pincode: "152004", lat: 30.9058, lng: 74.6157 },
  { area: "Near SBBS University North Gate", pincode: "152004", lat: 30.9079, lng: 74.6192 },
  { area: "Near SBBS University Academic Block", pincode: "152004", lat: 30.9046, lng: 74.6131 },
  { area: "Near SBBS University Health Desk", pincode: "152004", lat: 30.9038, lng: 74.6178 },
  { area: "Near SBBS University Service Road", pincode: "152004", lat: 30.9091, lng: 74.6116 },
];

function makeVerifiedDonor(region, index, location, phoneBase) {
  const now = new Date();
  const serial = String(index + 1).padStart(2, "0");
  const phoneNumber = String(phoneBase + index);

  return {
    fullName: `${region} Verified Donor ${serial}`,
    email: `${region.toLowerCase()}-donor-${serial}@temporary.resqnet.dev`,
    phoneNumber,
    whatsappNumber: phoneNumber,
    gender: GENDERS[index % GENDERS.length],
    bloodGroup: BLOOD_GROUPS[index % BLOOD_GROUPS.length],
    donorType: index % 4 === 0 ? "Blood Bank" : "Individual",
    resourceType: "Blood",
    address: location.area,
    pincode: location.pincode,
    availableNow: index % 5 !== 0,
    preferredContact: index % 2 === 0 ? "Call" : "WhatsApp",
    status: "verified",
    createdAt: now,
    verifiedAt: now,
    lastActiveAt: now,
    location: { type: "Point", coordinates: [location.lng, location.lat] },
  };
}

const equipmentTypes = [
  "Oxygen Cylinder",
  "Ventilator",
  "ICU Bed",
  "Ambulance",
  "Wheelchair",
  "Nebulizer",
  "First Aid Kit",
  "Oxygen Cylinder",
];

function makeVerifiedResourceProvider(region, index, location, phoneBase) {
  const now = new Date();
  const serial = String(index + 1).padStart(2, "0");
  const phoneNumber = String(phoneBase + index);

  return {
    fullName: `${region} Emergency Resource ${serial}`,
    email: `${region.toLowerCase()}-resource-${serial}@temporary.resqnet.dev`,
    phoneNumber,
    whatsappNumber: phoneNumber,
    gender: "Prefer not to say",
    bloodGroup: "",
    donorType: "Emergency Supplier",
    resourceType: equipmentTypes[index % equipmentTypes.length],
    address: location.area,
    pincode: location.pincode,
    availableNow: true,
    preferredContact: "Call",
    status: "verified",
    createdAt: now,
    verifiedAt: now,
    lastActiveAt: now,
    location: { type: "Point", coordinates: [location.lng, location.lat] },
  };
}

function buildSeedListings() {
  const hpDonors = hpLocations.map((location, index) => makeVerifiedDonor("HP", index, location, 7800001000));
  const punjabDonors = punjabLocations.map((location, index) => makeVerifiedDonor("Punjab", index, location, 7900002000));

  const hpResources = hpLocations.slice(0, 4).map((location, index) =>
    makeVerifiedResourceProvider("HP", index, location, 7815003000)
  );

  const punjabResources = punjabLocations.slice(0, 4).map((location, index) =>
    makeVerifiedResourceProvider("Punjab", index + 4, location, 7915004000)
  );

  return [...hpDonors, ...punjabDonors, ...hpResources, ...punjabResources];
}

export async function POST() {
  try {
    const donorsCollection = await getDonorsCollection();
    const listings = buildSeedListings();

    const operations = listings.map((listing) => ({
      updateOne: {
        filter: { phoneNumber: listing.phoneNumber },
        update: { $setOnInsert: listing },
        upsert: true,
      },
    }));

    const result = await donorsCollection.bulkWrite(operations, { ordered: false });

    return NextResponse.json({
      message: "Seed sync completed",
      totalPrepared: listings.length,
      inserted: result.upsertedCount,
      matchedExisting: result.matchedCount,
      updatedExisting: result.modifiedCount,
      regionalSummary: {
        hpVerifiedDonors: 10,
        punjabVerifiedDonors: 10,
        verifiedResourceProviders: 8,
      },
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to seed data", error: error.message }, { status: 500 });
  }
}
