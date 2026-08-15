/**
 * MongoDB connection + collection accessors.
 *
 * One client promise is cached at module level so the whole server shares a
 * single connection pool.
 */
import { MongoClient } from "mongodb";

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB || "orbitjobs";

let _client;

function clientPromise() {
  if (!_client) {
    _client = new MongoClient(URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }).connect();
  }
  return _client;
}

export async function getDb() {
  return (await clientPromise()).db(DB_NAME);
}

/* Collection helpers — keeps query sites terse and consistent. */
export async function col(name) {
  return (await getDb()).collection(name);
}

export const Jobs = () => col("jobs");
export const Users = () => col("users");
export const Employers = () => col("employers");
export const Applications = () => col("applications");
export const SavedJobs = () => col("savedJobs");
export const Alerts = () => col("alerts");
export const TalentPool = () => col("talentPool");
export const Reports = () => col("reports");
export const Contacts = () => col("contacts");
export const Newsletter = () => col("newsletter");
export const AuditLog = () => col("auditLog");
export const EmailLog = () => col("emailLog");
export const Sources = () => col("sources");
export const Articles = () => col("articles");
export const Testimonials = () => col("testimonials");

/** Singleton documents (taxonomies) live in `meta` keyed by _id. */
export async function getTaxonomies() {
  const doc = await (await col("meta")).findOne({ _id: "taxonomies" });
  if (!doc) throw new Error("Database not seeded — run `npm run seed` first.");
  return doc.value;
}

/** Atomic sequential ids with the original `prefix_10042` shape. */
export async function nextId(prefix) {
  const counters = await col("counters");
  const r = await counters.findOneAndUpdate(
    { _id: "seq" },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return `${prefix}_${r?.value ?? Date.now()}`;
}

export function nowIso() {
  return new Date().toISOString();
}
