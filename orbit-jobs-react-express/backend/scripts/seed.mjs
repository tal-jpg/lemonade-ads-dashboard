/**
 * Seed: builds the MongoDB database from fixtures + the aggregation pipeline.
 * Run with `npm run seed`. Deterministic apart from "now".
 *
 * Connects to MONGODB_URI (default mongodb://127.0.0.1:27017), database
 * MONGODB_DB (default "orbitjobs"). Drops and recreates every collection,
 * then creates the indexes the app queries against.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { runPipeline, buildDescription, seniorityFor } from "./aggregate.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = path.join(ROOT, "data", "fixtures");
const read = (f) => JSON.parse(fs.readFileSync(path.join(FIXTURES, f)));

const URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.MONGODB_DB || "orbitjobs";
const JOB_TERM_DAYS = 30;

const tax = read("taxonomies.json");
const companies = read("companies.json");
const articles = read("articles.json");
const testimonials = read("testimonials.json");
const sources = read("sources.json");

const now = Date.now();
const iso = (d) => new Date(d).toISOString();
const days = (n) => n * 864e5;
let seq = 10000;
const id = (p) => `${p}_${++seq}`;
const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const regionsByCity = Object.fromEntries(tax.locations.map((l) => [l.city, l.region]));
const regionsByCityUS = Object.fromEntries((tax.locations_us || []).map((l) => [l.city, l.region]));

/* ---------- users & employers ---------- */
const hash = (p) => bcrypt.hashSync(p, 8);

const employers = companies.map((c) => ({
  id: id("emp"),
  slug: c.slug, name: c.name, industry: c.industry, city: c.city, size: c.size,
  mark: c.mark, color: c.color, about: c.about,
  website: `https://www.${c.slug.replace(/-/g, "")}.example`,
  country: c.country || "UK",
  verifiedStatus: "verified",
  createdAt: iso(now - days(120)),
}));
const empBySlug = Object.fromEntries(employers.map((e) => [e.slug, e]));

const users = [
  {
    id: id("usr"), role: "candidate", name: "Amelia Hart",
    email: "amelia@demo.orbitjobs.example", passHash: hash("demo1234"),
    verified: true, sessionVersion: 0, country: "UK",
    profile: { phone: "07700 900123", desiredSalary: 38000, preferredLocations: ["Manchester", "Remote"], workModel: "hybrid", noticePeriod: "1 month" },
    cvs: [], marketingConsent: { flag: false }, createdAt: iso(now - days(40)),
  },
  {
    id: id("usr"), role: "employer", name: "Priya Shah",
    email: "priya@thameslogistics.example", passHash: hash("demo1234"),
    verified: true, sessionVersion: 0, country: "UK",
    employerId: empBySlug["thames-logistics"].id, createdAt: iso(now - days(90)),
  },
  {
    id: id("usr"), role: "employer", name: "Daniel Kerr",
    email: "daniel@plumline.example", passHash: hash("demo1234"),
    verified: true, sessionVersion: 0, country: "UK",
    employerId: empBySlug["plumline"].id, createdAt: iso(now - days(60)),
  },
  {
    id: id("usr"), role: "employer", name: "Maya Torres",
    email: "maya@hudsonanalytics.example", passHash: hash("demo1234"),
    verified: true, sessionVersion: 0, country: "US",
    employerId: empBySlug["hudson-analytics"].id, createdAt: iso(now - days(45)),
  },
  {
    id: id("usr"), role: "admin", name: "Sam Ops",
    email: "admin@orbitjobs.example", passHash: hash("admin1234"),
    verified: true, sessionVersion: 0, country: "UK", createdAt: iso(now - days(200)),
  },
];

/* ---------- direct jobs (employer-posted) ---------- */
const DIRECT_SPECS = [
  ["novabank", "Senior Software Engineer", "technology", "London", "hybrid", "permanent", [78000, 95000]],
  ["novabank", "Product Manager", "technology", "London", "hybrid", "permanent", [65000, 80000]],
  ["novabank", "Compliance Officer", "legal", "London", "hybrid", "permanent", [55000, 70000]],
  ["thames-logistics", "Warehouse Shift Manager", "operations-and-supply-chain", "Leeds", "on-site", "permanent", [34000, 40000]],
  ["thames-logistics", "Transport Planner", "operations-and-supply-chain", "Leeds", "on-site", "permanent", [30000, 36000]],
  ["thames-logistics", "HR Advisor", "human-resources", "Leeds", "hybrid", "permanent", [32000, 38000]],
  ["thames-logistics", "Warehouse Operative", "operations-and-supply-chain", "Nottingham", "on-site", "temporary", [24000, 26000]],
  ["brightcare-group", "Registered Nurse", "healthcare", "Manchester", "on-site", "permanent", [34000, 40000]],
  ["brightcare-group", "Care Home Manager", "healthcare", "Manchester", "on-site", "permanent", [45000, 55000]],
  ["brightcare-group", "Healthcare Assistant", "healthcare", "Glasgow", "on-site", "part-time", [23000, 25000]],
  ["kelpie-energy", "Electrical Engineer", "engineering", "Edinburgh", "hybrid", "permanent", [48000, 60000]],
  ["kelpie-energy", "Project Manager", "construction", "Edinburgh", "hybrid", "permanent", [55000, 68000]],
  ["harper-and-vale", "Commercial Solicitor", "legal", "Birmingham", "hybrid", "permanent", [58000, 75000]],
  ["harper-and-vale", "Paralegal", "legal", "Birmingham", "on-site", "permanent", [26000, 30000]],
  ["plumline", "Digital Marketing Manager", "marketing", "Bristol", "hybrid", "permanent", [42000, 50000]],
  ["plumline", "Customer Service Advisor", "customer-experience", "Remote", "remote", "permanent", [25000, 28000]],
  ["orchard-schools-trust", "Primary Teacher", "education", "Nottingham", "on-site", "permanent", [31000, 43000]],
  ["orchard-schools-trust", "Teaching Assistant", "education", "Nottingham", "on-site", "part-time", [21000, 23500]],
  ["ferrocast", "Maintenance Engineer", "engineering", "Leeds", "on-site", "permanent", [42000, 48000]],
  ["ferrocast", "Quality Engineer", "engineering", "Leeds", "on-site", "permanent", [38000, 45000]],
  ["citymed-partners", "Clinical Pharmacist", "healthcare", "London", "on-site", "permanent", [52000, 62000]],
  ["meridian-media", "Performance Marketing Manager", "marketing", "Manchester", "hybrid", "permanent", [45000, 55000]],
  ["meridian-media", "Content Writer", "marketing", "Manchester", "hybrid", "permanent", [28000, 34000]],
  ["grayline-construct", "Site Manager", "construction", "Cardiff", "on-site", "permanent", [52000, 62000]],
  ["grayline-construct", "Quantity Surveyor", "construction", "Cardiff", "hybrid", "permanent", [50000, 62000]],
  ["fintor", "Software Engineer", "technology", "Remote", "remote", "permanent", [55000, 72000]],
  ["fintor", "Customer Success Manager", "customer-experience", "Remote", "remote", "permanent", [38000, 46000]],
  ["fintor", "Finance Analyst", "finance-and-accounting", "Remote", "remote", "permanent", [40000, 48000]],
];

const DIRECT_SPECS_US = [
  ["hudson-analytics", "Senior Software Engineer", "technology", "New York", "hybrid", "permanent", [155000, 190000], true],
  ["hudson-analytics", "Data Engineer", "technology", "New York", "hybrid", "permanent", [130000, 160000], true],
  ["hudson-analytics", "Compliance Officer", "legal", "New York", "hybrid", "permanent", [110000, 135000], false],
  ["goldengate-health", "Registered Nurse", "healthcare", "San Francisco", "on-site", "permanent", [105000, 130000], false],
  ["goldengate-health", "Clinical Pharmacist", "healthcare", "San Francisco", "on-site", "permanent", [140000, 165000], false],
  ["goldengate-health", "Customer Service Advisor", "customer-experience", "Remote", "remote", "permanent", [42000, 50000], false],
  ["lonestar-logistics", "Warehouse Shift Manager", "operations-and-supply-chain", "Austin", "on-site", "permanent", [52000, 62000], false],
  ["lonestar-logistics", "Transport Planner", "operations-and-supply-chain", "Austin", "on-site", "permanent", [48000, 58000], false],
  ["lonestar-logistics", "HR Advisor", "human-resources", "Austin", "hybrid", "permanent", [55000, 68000], false],
  ["beacon-hill-legal", "Paralegal", "legal", "Boston", "on-site", "permanent", [58000, 70000], false],
  ["beacon-hill-legal", "In-house Counsel", "legal", "Boston", "hybrid", "permanent", [145000, 175000], true],
  ["cascade-renewables", "Electrical Engineer", "engineering", "Seattle", "hybrid", "permanent", [95000, 118000], true],
  ["cascade-renewables", "Project Manager", "construction", "Seattle", "hybrid", "permanent", [105000, 125000], false],
  ["peachtree-media", "Performance Marketing Manager", "marketing", "Atlanta", "hybrid", "permanent", [85000, 100000], false],
  ["peachtree-media", "Content Writer", "marketing", "Atlanta", "hybrid", "permanent", [58000, 70000], false],
  ["peachtree-media", "Account Executive", "sales", "Atlanta", "hybrid", "permanent", [65000, 80000], false],
];

const industryByEmp = Object.fromEntries(companies.map((c) => [c.slug, c.industry]));

function makeDirectJob([empSlug, title, spec, city, model, type, [mn, mx], visa], i, country = "UK") {
  const emp = empBySlug[empSlug];
  const tier = seniorityFor(title);
  const posted = now - days(i % 21);
  const jid = id("job");
  const disclosed = i % 9 !== 4; // a couple of undisclosed direct roles to exercise the nudge
  return {
    id: jid,
    slug: `${slugify(title)}-${slugify(emp.name)}-${jid.slice(-4)}`,
    reference: `OJ-${jid.slice(-5)}`,
    title, class: "direct",
    employerId: emp.id, companyName: emp.name,
    specialism: spec, industry: industryByEmp[empSlug],
    seniority: tier, jobType: type, workModel: model,
    location: { country, city, region: (country === "US" ? regionsByCityUS : regionsByCity)[city] || country },
    salary: { min: disclosed ? mn : null, max: disclosed ? mx : null, period: "year", currency: country === "US" ? "USD" : "GBP", disclosed },
    visaSponsorship: country === "US" ? !!visa : undefined,
    description: buildDescription(title, emp.name, city, tier, country),
    screeningQuestions: i % 3 === 0 ? [
      { q: "Briefly, what makes you a strong fit for this role?", kind: "text" },
      { q: "Do you have the right to work in the UK?", kind: "yesno" },
    ] : [],
    applyMethod: "native", externalApplyUrl: null,
    status: "live",
    postedAt: iso(posted),
    validThrough: iso(posted + days(JOB_TERM_DAYS)),
    views: 40 + ((i * 37) % 300), applies: 0,
    featuredFlag: false,
    createdAt: iso(posted),
  };
}

const directJobs = [
  ...DIRECT_SPECS.map((d, i) => makeDirectJob(d, i, "UK")),
  ...DIRECT_SPECS_US.map((d, i) => makeDirectJob(d, i + 3, "US")),
];

/* one expired direct job to demo the expired-role flow */
{
  const j = makeDirectJob(["novabank", "Data Engineer", "technology", "London", "hybrid", "permanent", [70000, 85000]], 99);
  j.status = "expired";
  j.postedAt = iso(now - days(45));
  j.validThrough = iso(now - days(15));
  directJobs.push(j);
}

/* one in-review job so the admin queue isn't empty */
{
  const j = makeDirectJob(["plumline", "SEO Specialist", "marketing", "Bristol", "hybrid", "permanent", [34000, 42000]], 55);
  j.status = "in_review";
  directJobs.push(j);
}

/* ---------- aggregated jobs via the pipeline (per market) ---------- */
const ukRun = runPipeline({ directJobs, now, country: "UK" });
const usRun = runPipeline({ directJobs, now, country: "US" });
const aggregated = [...ukRun.jobs, ...usRun.jobs];
const stats = [...ukRun.stats, ...usRun.stats];
const suppressedByDirect = ukRun.suppressedByDirect + usRun.suppressedByDirect;

const aggregatedJobs = aggregated.map((a, i) => {
  const jid = id("job");
  const posted = Date.parse(a.postedAt);
  const expired = i % 41 === 40; // one aggregated expired listing
  return {
    id: jid,
    slug: `${slugify(a.title)}-${slugify(a.companyName)}-${jid.slice(-4)}`,
    reference: `OJ-${jid.slice(-5)}`,
    title: a.title, class: "aggregated",
    employerId: null, companyName: a.companyName,
    specialism: a.specialism, industry: guessIndustry(a.specialism, i),
    seniority: seniorityFor(a.title), jobType: a.jobType, workModel: a.workModel,
    location: a.location,
    salary: a.salary,
    description: a.description,
    screeningQuestions: [],
    visaSponsorship: a.visaSponsorship,
    applyMethod: "external", externalApplyUrl: a.source.outboundUrl,
    source: { ...a.source, firstSeen: a.postedAt, lastSeen: iso(now) },
    needsReview: a.classificationConfidence < 0.5,
    status: expired ? "expired" : "live",
    postedAt: a.postedAt,
    validThrough: iso(posted + days(JOB_TERM_DAYS)),
    views: 15 + ((i * 23) % 240), applies: 0,
    featuredFlag: false,
    createdAt: a.postedAt,
  };
});

function guessIndustry(spec, i) {
  const map = {
    technology: ["fintech", "media", "professional-services"],
    "finance-and-accounting": ["professional-services", "fintech"],
    sales: ["media", "retail-and-ecommerce"],
    marketing: ["media", "retail-and-ecommerce"],
    engineering: ["manufacturing", "energy"],
    healthcare: ["healthcare-and-life-sciences"],
    "human-resources": ["professional-services", "public-sector"],
    "operations-and-supply-chain": ["manufacturing", "retail-and-ecommerce"],
    legal: ["professional-services"],
    "customer-experience": ["retail-and-ecommerce", "fintech"],
    education: ["public-sector"],
    construction: ["energy", "public-sector"],
  }[spec] || ["professional-services"];
  return map[i % map.length];
}

const jobs = [...directJobs, ...aggregatedJobs];

/* ---------- demo applicants for the Thames Logistics dashboard ---------- */
const thames = empBySlug["thames-logistics"];
const thamesJobs = jobs.filter((j) => j.employerId === thames.id && j.status === "live");
const APPLICANT_NAMES = [
  ["Jordan Ellis", "jordan.ellis@mail.example"], ["Sofia Novak", "sofia.novak@mail.example"],
  ["Liam Chen", "liam.chen@mail.example"], ["Grace Adeyemi", "grace.adeyemi@mail.example"],
  ["Ben Whitfield", "ben.whitfield@mail.example"], ["Nadia Rahman", "nadia.rahman@mail.example"],
  ["Owen Price", "owen.price@mail.example"], ["Chloe Sutton", "chloe.sutton@mail.example"],
];
const STATUSES = ["submitted", "submitted", "viewed", "shortlisted", "submitted", "rejected", "viewed", "submitted"];
const applications = [];
thamesJobs.forEach((j, ji) => {
  const nApps = 2 + (ji % 3);
  for (let k = 0; k < nApps; k++) {
    const [name, email] = APPLICANT_NAMES[(ji * 3 + k) % APPLICANT_NAMES.length];
    const st = STATUSES[(ji * 2 + k) % STATUSES.length];
    const appliedAt = iso(now - days(1 + ((ji * 5 + k * 2) % 12)));
    applications.push({
      id: id("app"), jobId: j.id, candidateId: null,
      name, email, phone: "07700 900" + String(200 + ji * 10 + k),
      cvFile: null, cvUrl: "https://linkedin.example/in/" + slugify(name),
      message: "I've attached my profile — my experience lines up well with this role and I'm available at short notice.",
      screeningAnswers: j.screeningQuestions.map((q) => ({ q: q.q, a: q.kind === "yesno" ? "Yes" : "Three years in a comparable role, with strong references." })),
      status: st,
      statusHistory: [{ status: "submitted", at: appliedAt }].concat(st !== "submitted" ? [{ status: st, at: iso(now - days(1)) }] : []),
      source: "search", appliedAt,
    });
    j.applies += 1;
  }
});

/* ---------- write to MongoDB ---------- */
const client = new MongoClient(URI);
await client.connect();
const db = client.db(DB_NAME);

const collections = {
  users, employers, jobs, applications,
  savedJobs: [], alerts: [], talentPool: [], reports: [], contacts: [], newsletter: [],
  auditLog: [{ id: id("aud"), actor: "system", action: "seed", target: "database", at: iso(now), reason: `Seeded ${jobs.length} jobs (${directJobs.length} direct, ${aggregatedJobs.length} aggregated; ${suppressedByDirect} aggregated duplicates suppressed by direct listings)` }],
  emailLog: [],
  sources: sources.map((s) => ({ ...s, health: stats.find((x) => x.sourceId === s.id) || null })),
  articles, testimonials,
};

for (const [name, rows] of Object.entries(collections)) {
  await db.collection(name).drop().catch(() => {});
  if (rows.length) await db.collection(name).insertMany(rows.map((r) => ({ ...r })));
}
await db.collection("meta").drop().catch(() => {});
await db.collection("meta").insertOne({ _id: "taxonomies", value: tax });
await db.collection("counters").drop().catch(() => {});
await db.collection("counters").insertOne({ _id: "seq", value: seq });

/* indexes the app queries against */
await db.collection("jobs").createIndexes([
  { key: { id: 1 }, unique: true },
  { key: { slug: 1 } },
  { key: { status: 1, "location.country": 1, postedAt: -1 } },
  { key: { employerId: 1 } },
  { key: { specialism: 1 } },
]);
await db.collection("users").createIndexes([{ key: { id: 1 }, unique: true }, { key: { email: 1 } }]);
await db.collection("employers").createIndexes([{ key: { id: 1 }, unique: true }, { key: { slug: 1 } }]);
await db.collection("applications").createIndexes([{ key: { id: 1 }, unique: true }, { key: { jobId: 1 } }, { key: { candidateId: 1 } }]);
await db.collection("savedJobs").createIndexes([{ key: { candidateId: 1, jobId: 1 } }]);
await db.collection("alerts").createIndexes([{ key: { candidateId: 1 } }]);
await db.collection("articles").createIndexes([{ key: { slug: 1 } }]);

console.log(`Seeded MongoDB ${URI}/${DB_NAME}`);
console.log(` jobs: ${jobs.length} (direct ${directJobs.length}, aggregated ${aggregatedJobs.length}, suppressed dupes ${suppressedByDirect})`);
console.log(` by market: UK ${jobs.filter((j) => j.location.country === "UK").length} | US ${jobs.filter((j) => j.location.country === "US").length}`);
console.log(` users: ${users.length}, employers: ${employers.length}, applications: ${applications.length}`);
await client.close();
