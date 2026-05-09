import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "db.json");
const oneYearMs = 365 * 24 * 60 * 60 * 1000;

const defaultAdminNumber = "01741815153";

const defaultDb = {
  settings: {
    editMode: "review",
    deleteMode: "review",
  },
  users: [
    {
      id: "admin-1",
      name: "Admin",
      number: defaultAdminNumber,
      role: "admin",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  sessions: [],
  packages: [],
  reviews: [],
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

const ensureDbFile = async () => {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dbFile);
  } catch {
    await fs.writeFile(dbFile, JSON.stringify(defaultDb, null, 2));
  }
};

export const readDb = async () => {
  await ensureDbFile();
  const raw = await fs.readFile(dbFile, "utf8");

  try {
    const parsed = JSON.parse(raw);

    return {
      ...defaultDb,
      ...parsed,
      settings: { ...defaultDb.settings, ...(parsed.settings || {}) },
      users: parsed.users || [],
      sessions: parsed.sessions || [],
      packages: parsed.packages || [],
      reviews: parsed.reviews || [],
    };
  } catch {
    await fs.writeFile(dbFile, JSON.stringify(defaultDb, null, 2));
    return defaultDb;
  }
};

export const writeDb = async (db) => {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(dbFile, JSON.stringify(db, null, 2));
};

export const uid = (prefix) => `${prefix}-${crypto.randomUUID()}`;

export const createSession = async (userId) => {
  const db = await readDb();
  const token = crypto.randomBytes(36).toString("hex");
  const now = Date.now();
  const expiresAt = new Date(now + oneYearMs).toISOString();

  db.sessions = db.sessions.filter(
    (session) => new Date(session.expiresAt).getTime() > now
  );

  db.sessions.push({
    token,
    userId,
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
  if (!token) return null;

  const db = await readDb();
  const session = db.sessions.find((item) => item.token === token);

  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const user = db.users.find((item) => item.id === session.userId);
  if (!user) return null;

  return { db, token, session, user };
};

export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  number: user.number,
  role: user.role,
  createdAt: user.createdAt,
});

export const withRemaining = (pkg) => {
  const createdAt = new Date(pkg.createdAt).getTime();
  const totalMs = Number(pkg.days || 0) * 24 * 60 * 60 * 1000;
  const endAt = new Date(createdAt + totalMs).toISOString();
  const remainingMs = createdAt + totalMs - Date.now();
  const daysLeft = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const usedDays = Math.min(
    Number(pkg.days || 0),
    Math.max(0, Math.floor((Date.now() - createdAt) / (24 * 60 * 60 * 1000)))
  );

  return {
    ...pkg,
    endAt,
    daysLeft,
    usedDays,
    status: daysLeft <= 0 ? "expired" : daysLeft <= 3 ? "ending-soon" : "active",
  };
};
