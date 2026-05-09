import crypto from "crypto";
import { MongoClient } from "mongodb";

const oneYearSeconds = 365 * 24 * 60 * 60;
const oneYearMs = oneYearSeconds * 1000;
const dayMs = 24 * 60 * 60 * 1000;
const defaultAdminNumber = "01741815153";

const defaultSettings = {
  editMode: "review",
  deleteMode: "review",
};

export const mobileRegex = /^01\d{9}$/;

export const adminNumbers = () => {
  const fromEnv = process.env.ADMIN_NUMBERS;
  if (!fromEnv) return [defaultAdminNumber];

  return fromEnv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const mongoUri = () => process.env.MONGODB_URI;
const mongoDbName = () => process.env.MONGODB_DB || "gpt_customer_data_center";
const jwtSecret = () => process.env.JWT_SECRET || "change-this-jwt-secret-in-env";

const base64Url = (input) => Buffer.from(input).toString("base64url");

const sign = (data) =>
  crypto.createHmac("sha256", jwtSecret()).update(data).digest("base64url");

const createJwt = (payload) => {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyJwt = (token) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);

  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

let clientPromise;

const getMongoClient = () => {
  if (!mongoUri()) {
    throw new Error("MONGODB_URI is missing. Add it in .env.local before running the app.");
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(mongoUri()).connect();
  }

  return clientPromise;
};

export const getMongoDb = async () => {
  const client = await getMongoClient();
  return client.db(mongoDbName());
};

const cleanDoc = (doc) => {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
};

const collectionDocs = async (db, name) => {
  const docs = await db.collection(name).find({}).sort({ createdAt: -1 }).toArray();
  return docs.map(cleanDoc);
};

const ensureDefaults = async (db) => {
  await db.collection("settings").updateOne(
    { id: "main" },
    { $setOnInsert: { id: "main", ...defaultSettings, createdAt: new Date().toISOString() } },
    { upsert: true }
  );

  const now = new Date().toISOString();
  await Promise.all(
    adminNumbers().map((number, index) =>
      db.collection("users").updateOne(
        { number },
        {
          $set: { role: "admin", updatedAt: now },
          $setOnInsert: {
            id: index === 0 ? "admin-1" : uid("user"),
            name: "Admin",
            number,
            email: "",
            role: "admin",
            createdAt: now,
          },
        },
        { upsert: true }
      )
    )
  );
};

export const readDb = async () => {
  const db = await getMongoDb();
  await ensureDefaults(db);

  const [settingsDoc, users, sessions, packages, reviews] = await Promise.all([
    db.collection("settings").findOne({ id: "main" }),
    collectionDocs(db, "users"),
    collectionDocs(db, "sessions"),
    collectionDocs(db, "packages"),
    collectionDocs(db, "reviews"),
  ]);

  return {
    settings: { ...defaultSettings, ...cleanDoc(settingsDoc) },
    users,
    sessions,
    packages,
    reviews,
  };
};

const replaceCollection = async (db, name, docs) => {
  await db.collection(name).deleteMany({});
  if (docs?.length) {
    await db.collection(name).insertMany(docs.map((doc) => ({ ...doc })));
  }
};

export const writeDb = async (data) => {
  const db = await getMongoDb();
  await ensureDefaults(db);

  await Promise.all([
    db.collection("settings").updateOne(
      { id: "main" },
      { $set: { id: "main", ...defaultSettings, ...(data.settings || {}) } },
      { upsert: true }
    ),
    replaceCollection(db, "users", data.users || []),
    replaceCollection(db, "sessions", data.sessions || []),
    replaceCollection(db, "packages", data.packages || []),
    replaceCollection(db, "reviews", data.reviews || []),
  ]);
};

export const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export const createSession = async (userId) => {
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new Error("User not found for token creation");

  const now = Date.now();
  const exp = Math.floor(now / 1000) + oneYearSeconds;
  const jti = uid("jwt");
  const token = createJwt({
    sub: user.id,
    number: user.number,
    role: user.role,
    jti,
    iat: Math.floor(now / 1000),
    exp,
  });
  const expiresAt = new Date(now + oneYearMs).toISOString();

  db.sessions = db.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now
  );

  db.sessions.push({
    id: jti,
    token,
    userId,
    number: user.number,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  });

  await writeDb(db);

  return { token, expiresAt };
};

export const getTokenFromRequest = (request) => {
  const auth = request.headers.get("authorization") || "";
  const fromBearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  return request.headers.get("x-auth-token") || fromBearer;
};

export const getAuth = async (request) => {
  const token = getTokenFromRequest(request);
  const jwtPayload = verifyJwt(token);
  if (!jwtPayload) return null;

  const db = await readDb();
  const session = db.sessions.find((item) => item.token === token && item.id === jwtPayload.jti);

  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const user = db.users.find((item) => item.id === jwtPayload.sub);
  if (!user) return null;

  return { db, token, session, user };
};

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  number: user.number,
  email: user.email || "",
  deviceName: user.deviceName || "",
  role: user.role,
  createdAt: user.createdAt,
});

export const withRemaining = (pkg) => {
  const startedAt = new Date(pkg.startedAt || pkg.purchasedAt || pkg.createdAt).getTime();
  const durationMs = Number(pkg.days || 0) * dayMs;
  const endTime = pkg.endsAt ? new Date(pkg.endsAt).getTime() : startedAt + durationMs;
  const remainingMs = Math.max(0, endTime - Date.now());
  const usedMs = Math.max(0, Math.min(durationMs, Date.now() - startedAt));
  const daysLeft = Math.ceil(remainingMs / dayMs);
  const usedDays = Math.floor(usedMs / dayMs);

  return {
    ...pkg,
    startedAt: new Date(startedAt).toISOString(),
    purchasedAt: pkg.purchasedAt || pkg.createdAt,
    endsAt: new Date(endTime).toISOString(),
    endAt: new Date(endTime).toISOString(),
    remainingMs,
    secondsLeft: Math.ceil(remainingMs / 1000),
    minutesLeft: Math.ceil(remainingMs / (60 * 1000)),
    hoursLeft: Math.ceil(remainingMs / (60 * 60 * 1000)),
    daysLeft,
    usedDays,
    usedSeconds: Math.floor(usedMs / 1000),
    status: daysLeft <= 0 ? "expired" : daysLeft <= 3 ? "ending-soon" : "active",
  };
};
