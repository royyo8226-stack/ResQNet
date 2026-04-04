import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB || "resqnet";
const options = {
  serverSelectionTimeoutMS: 10000,
};

let clientPromise;
let donorIndexesReadyPromise;
let userIndexesReadyPromise;
let otpIndexesReadyPromise;

export function isMongoConfigured() {
  return Boolean(uri);
}

function getClientPromise() {
  if (!isMongoConfigured()) {
    throw new Error("MongoDB is not configured. Set MONGODB_URI to enable API routes.");
  }

  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._resqnetMongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._resqnetMongoClientPromise = client.connect();
    }
    clientPromise = global._resqnetMongoClientPromise;
  } else {
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(dbName);
}

export async function getDonorsCollection() {
  const db = await getDb();
  const collection = db.collection("donors");

  if (!donorIndexesReadyPromise) {
    donorIndexesReadyPromise = Promise.all([
      collection.createIndex({ location: "2dsphere" }),
      collection.createIndex({ resourceType: 1, status: 1, availableNow: 1, bloodGroup: 1 }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error) => {
      donorIndexesReadyPromise = null;
      throw error;
    });
  }

  await donorIndexesReadyPromise;

  return collection;
}

export async function getUsersCollection() {
  const db = await getDb();
  const collection = db.collection("users");

  if (!userIndexesReadyPromise) {
    userIndexesReadyPromise = Promise.all([
      collection.createIndex({ email: 1 }, { unique: true }),
      collection.createIndex({ role: 1, createdAt: -1 }),
    ]).catch((error) => {
      userIndexesReadyPromise = null;
      throw error;
    });
  }

  await userIndexesReadyPromise;

  return collection;
}

export async function getOtpCodesCollection() {
  const db = await getDb();
  const collection = db.collection("otp_codes");

  if (!otpIndexesReadyPromise) {
    otpIndexesReadyPromise = Promise.all([
      collection.createIndex({ email: 1, purpose: 1, createdAt: -1 }),
      collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    ]).catch((error) => {
      otpIndexesReadyPromise = null;
      throw error;
    });
  }

  await otpIndexesReadyPromise;

  return collection;
}
