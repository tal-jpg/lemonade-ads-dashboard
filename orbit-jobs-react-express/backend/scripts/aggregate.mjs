/**
 * Aggregation pipeline (ported unchanged from the Express build).
 *
 * Ingest → normalise (field maps) → classify → deduplicate → attribute.
 *
 * In production each adapter fetches a real partner feed/API. In this demo the
 * "fetch" step deterministically synthesises raw items in each source's native
 * field shape, so the whole pipeline — field-map translation, salary/location
 * normalisation, classification, dedup with "also on" merging, direct-beats-
 * aggregated — runs exactly as it would against live feeds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "fixtures");
const tax = JSON.parse(fs.readFileSync(path.join(FIXTURES, "taxonomies.json")));
const sources = JSON.parse(fs.readFileSync(path.join(FIXTURES, "sources.json")));

/* ---------- deterministic PRNG so seeds are stable ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- market data used to synthesise "external" listings ---------- */
const EXT_COMPANIES = [
  "Ashworth Digital", "Pennine Software", "Clyde Analytics", "Marlow & Finch",
  "Beacon Foods", "Rowan Health", "Stellar Retail Group", "Northgate Rail",
  "Cobalt Systems", "Fenwick Education", "Solent Marine", "Ivywell Care",
  "Brightpath Consulting", "Quayside Media", "Halcyon Hotels", "Redbrick Property",
  "Trentside Manufacturing", "Aurora Renewables", "Kestrel Security", "Portman Finance",
  "Willow & Sage", "Atlas Freight", "Nimbus Cloudworks", "Chalkhill Insurance",
  "Eastgate Pharma", "Foxglove Creative", "Denby Motors", "Camden & Bow",
];

const EXT_COMPANIES_US = [
  "Bluegrass Systems", "Harborline Freight", "Sequoia Health Partners", "Mesa Verde Media",
  "Pinnacle & Rowe", "Redwood Analytics", "Liberty Foods Group", "Cornerstone Build Co",
  "Skyline Legal Group", "Prairie Wind Energy", "Copperfield Retail", "Summitpoint Consulting",
  "Bayline Software", "Ironclad Manufacturing", "Magnolia Schools Network", "Granite State Insurance",
];

const TITLES = {
  technology: ["Software Engineer", "Senior Software Engineer", "Data Analyst", "DevOps Engineer", "IT Support Analyst", "Product Manager", "QA Engineer", "Data Engineer"],
  "finance-and-accounting": ["Accounts Assistant", "Management Accountant", "Financial Controller", "Payroll Specialist", "Finance Analyst", "Credit Controller", "Senior Finance Analyst"],
  sales: ["Sales Development Representative", "Account Executive", "Account Manager", "Business Development Manager", "Head of Sales", "Sales Administrator"],
  marketing: ["Marketing Executive", "Digital Marketing Manager", "Content Writer", "Performance Marketing Manager", "Head of Marketing", "Social Media Executive", "SEO Specialist"],
  engineering: ["Mechanical Design Engineer", "Electrical Engineer", "Civil Engineer", "Maintenance Engineer", "Quality Engineer", "Senior Mechanical Design Engineer", "Project Engineer"],
  healthcare: ["Registered Nurse", "Healthcare Assistant", "Physiotherapist", "Care Home Manager", "Clinical Pharmacist", "Support Worker", "Occupational Therapist"],
  "human-resources": ["HR Administrator", "HR Advisor", "Talent Acquisition Specialist", "HR Business Partner", "Head of People", "Learning & Development Coordinator"],
  "operations-and-supply-chain": ["Warehouse Operative", "Supply Chain Analyst", "Procurement Manager", "Operations Manager", "Transport Planner", "Warehouse Shift Manager"],
  legal: ["Paralegal", "Commercial Solicitor", "Conveyancer", "In-house Counsel", "Compliance Officer", "Legal Secretary"],
  "customer-experience": ["Customer Service Advisor", "Customer Success Manager", "Team Leader", "Complaints Handler", "Customer Support Specialist"],
  education: ["Primary Teacher", "Teaching Assistant", "Secondary Maths Teacher", "SENCO", "Nursery Practitioner", "Cover Supervisor"],
  construction: ["Site Manager", "Quantity Surveyor", "Electrician", "Project Manager", "Estimator", "Assistant Site Manager"],
};

/* salary bands: [min,max] annual GBP by seniority tier */
const BANDS = {
  technology: { junior: [26000, 34000], mid: [42000, 60000], senior: [65000, 90000], lead: [85000, 110000] },
  "finance-and-accounting": { junior: [24000, 28000], mid: [38000, 52000], senior: [55000, 75000], lead: [70000, 95000] },
  sales: { junior: [24000, 30000], mid: [35000, 50000], senior: [55000, 75000], lead: [70000, 100000] },
  marketing: { junior: [24000, 29000], mid: [35000, 48000], senior: [50000, 65000], lead: [60000, 85000] },
  engineering: { junior: [27000, 33000], mid: [38000, 52000], senior: [55000, 70000], lead: [65000, 85000] },
  healthcare: { junior: [22000, 26000], mid: [28000, 38000], senior: [40000, 55000], lead: [50000, 70000] },
  "human-resources": { junior: [23000, 28000], mid: [32000, 45000], senior: [50000, 65000], lead: [65000, 90000] },
  "operations-and-supply-chain": { junior: [22000, 27000], mid: [30000, 45000], senior: [45000, 60000], lead: [55000, 80000] },
  legal: { junior: [24000, 30000], mid: [45000, 70000], senior: [70000, 95000], lead: [90000, 120000] },
  "customer-experience": { junior: [22000, 26000], mid: [28000, 38000], senior: [38000, 50000], lead: [45000, 60000] },
  education: { junior: [20000, 25000], mid: [30000, 41000], senior: [42000, 55000], lead: [50000, 70000] },
  construction: { junior: [26000, 32000], mid: [40000, 55000], senior: [55000, 70000], lead: [65000, 90000] },
};

export function seniorityFor(title) {
  const t = title.toLowerCase();
  if (/head of|director/.test(t)) return "lead";
  if (/senior|manager|controller|partner|counsel|senco|solicitor/.test(t)) return "senior";
  if (/assistant|administrator|operative|advisor|support|junior|graduate|trainee|secretary|practitioner|coordinator|representative|writer|executive$/.test(t)) return "junior";
  return "mid";
}

/* classifier used by the pipeline — title keywords → specialism */
const CLASSIFY_RULES = Object.entries(TITLES).flatMap(([spec, titles]) =>
  titles.map((t) => [t.toLowerCase(), spec])
);
export function classify(title) {
  const t = (title || "").toLowerCase();
  for (const [needle, spec] of CLASSIFY_RULES) {
    if (t.includes(needle.replace(/^senior |^assistant /, "")) || t === needle) return { specialism: spec, confidence: 0.95 };
  }
  const loose = [
    [/engineer|developer|analyst.*data|devops|software/, "technology"],
    [/account|finance|payroll|credit/, "finance-and-accounting"],
    [/sales|business development/, "sales"],
    [/marketing|content|seo|brand/, "marketing"],
    [/nurse|nursing|care|clinical|health/, "healthcare"],
    [/teacher|teaching|school|nursery|preschool|substitute/, "education"],
    [/warehouse|supply|procurement|logistics|transport/, "operations-and-supply-chain"],
    [/estimator/, "construction"],
    [/escalations/, "customer-experience"],
    [/payable|accountant/, "finance-and-accounting"],
    [/legal|solicitor|paralegal|compliance|attorney|counsel/, "legal"],
    [/customer/, "customer-experience"],
    [/hr |human resources|people|talent/, "human-resources"],
    [/site|surveyor|construction|electrician/, "construction"],
  ];
  for (const [re, spec] of loose) if (re.test(t)) return { specialism: spec, confidence: 0.6 };
  return { specialism: "operations-and-supply-chain", confidence: 0.2 };
}

const DESC = {
  intro: (title, company, city, country = "UK") =>
    `${company} is hiring a ${title} to join the team ${city === "Remote" ? `on a remote (${country}) basis` : `in ${city}`}. This is a genuine opportunity to own meaningful work in a supportive, growing business — with clear expectations, honest pay and a proper onboarding plan.`,
  resp: {
    junior: ["Support the day-to-day running of the team with accuracy and energy", "Learn the tools, processes and standards that make the department work", "Communicate clearly with colleagues and customers", "Take ownership of routine tasks and improve them where you can"],
    mid: ["Own your workload end to end and deliver to agreed deadlines", "Work with stakeholders across the business to keep priorities clear", "Contribute improvements to how the team works, not just what it ships", "Support and informally mentor more junior colleagues"],
    senior: ["Lead delivery in your area and set the quality bar", "Partner with senior stakeholders and translate goals into plans", "Coach and develop the team around you", "Own the numbers, risks and decisions that come with the remit"],
    lead: ["Set direction and standards for the function", "Build, develop and retain a high-performing team", "Own budgets, planning and reporting to the leadership team", "Represent the function to the wider business and externally"],
  },
  req: {
    junior: ["Some relevant experience, education or a portfolio that shows aptitude", "Reliability, curiosity and clear written communication", "Right to work in the UK"],
    mid: ["Solid hands-on experience in a comparable role", "Confidence with the standard tools of the field", "A track record of delivering without close supervision", "Right to work in the UK"],
    senior: ["Deep experience in the field with evidence of results", "Stakeholder management and mentoring experience", "Sound judgement under ambiguity", "Right to work in the UK"],
    lead: ["Significant leadership experience in a comparable function", "Evidence of building teams and improving outcomes", "Commercial acumen and board-level communication", "Right to work in the UK"],
  },
  benefits: ["25 days' holiday plus bank holidays", "Pension contribution above the statutory minimum", "Hybrid working where the role allows", "A published salary band and annual review", "Learning budget and paid study support where relevant"],
};

export function buildDescription(title, company, city, tier, country = "UK") {
  return {
    intro: DESC.intro(title, company, city, country),
    responsibilities: DESC.resp[tier],
    requirements: DESC.req[tier],
    benefits: DESC.benefits.slice(0, 4),
  };
}

/* UK titles that read wrong in the US market → localised equivalents */
const US_TITLE_MAP = {
  "Commercial Solicitor": "Corporate Attorney",
  "Conveyancer": "Real Estate Paralegal",
  "In-house Counsel": "In-house Counsel",
  "Nursery Practitioner": "Preschool Teacher",
  "SENCO": "Special Education Teacher",
  "Secondary Maths Teacher": "High School Math Teacher",
  "Primary Teacher": "Elementary School Teacher",
  "Cover Supervisor": "Substitute Teacher",
  "Accounts Assistant": "Accounts Payable Specialist",
  "Management Accountant": "Senior Accountant",
  "Warehouse Operative": "Warehouse Associate",
  "Quantity Surveyor": "Construction Estimator",
  "Healthcare Assistant": "Certified Nursing Assistant",
  "Care Home Manager": "Clinical Care Manager",
  "Complaints Handler": "Escalations Specialist",
};

/* ---------- canonical market-job synthesis ---------- */
function synthesiseMarket(now, country = "UK") {
  const rand = mulberry32(country === "US" ? 20260812 : 20260811);
  const cities = (country === "US" ? tax.locations_us : tax.locations).map((l) => l.city);
  const specs = Object.keys(TITLES);
  const industriesBySpec = {
    technology: ["fintech", "media", "professional-services", "retail-and-ecommerce"],
    "finance-and-accounting": ["professional-services", "fintech", "manufacturing", "public-sector"],
    sales: ["media", "fintech", "retail-and-ecommerce", "professional-services"],
    marketing: ["media", "retail-and-ecommerce", "professional-services", "fintech"],
    engineering: ["manufacturing", "energy", "public-sector"],
    healthcare: ["healthcare-and-life-sciences", "public-sector"],
    "human-resources": ["professional-services", "manufacturing", "public-sector", "retail-and-ecommerce"],
    "operations-and-supply-chain": ["manufacturing", "retail-and-ecommerce", "energy"],
    legal: ["professional-services", "fintech", "public-sector"],
    "customer-experience": ["retail-and-ecommerce", "fintech", "media"],
    education: ["public-sector"],
    construction: ["energy", "public-sector", "manufacturing"],
  };
  const jobTypeRaw = ["Permanent", "Permanent", "Permanent", "Permanent", "Contract", "Temporary", "Part-time"];
  const workRaw = ["hybrid", "hybrid", "onsite", "remote"];

  const companiesPool = country === "US" ? EXT_COMPANIES_US : EXT_COMPANIES;
  const usd = (gbp) => Math.round((gbp * 1.32) / 500) * 500;
  const out = [];
  let n = 0;
  for (const spec of specs) {
    const titles = TITLES[spec];
    const perSpec = country === "US" ? 6 : 7;
    for (let j = 0; j < perSpec; j++) {
      let title = titles[Math.floor(rand() * titles.length)];
      const tier = seniorityFor(title); // tier from the canonical title so pay bands stay stable
      if (country === "US" && US_TITLE_MAP[title]) title = US_TITLE_MAP[title];
      const company = companiesPool[Math.floor(rand() * companiesPool.length)];
      let city = cities[Math.floor(rand() * cities.length)];
      let [lo, hi] = BANDS[spec][tier];
      if (country === "US") { lo = usd(lo); hi = usd(hi); }
      const min = Math.round((lo + rand() * (hi - lo) * 0.4) / 500) * 500;
      const max = Math.round((min + (hi - lo) * (0.35 + rand() * 0.4)) / 500) * 500;
      const disclosed = rand() > 0.22; // ~78% disclose — mirrors the real market gap Orbit fixes
      const days = Math.floor(rand() * 27);
      const posted = new Date(now - days * 864e5);
      const workModel = city === "Remote" ? "remote" : workRaw[Math.floor(rand() * workRaw.length)];
      out.push({
        key: `${company}|${title}|${city}`.toLowerCase(),
        title, company, city,
        specialism: spec,
        industry: industriesBySpec[spec][Math.floor(rand() * industriesBySpec[spec].length)],
        tier,
        jobTypeRaw: jobTypeRaw[Math.floor(rand() * jobTypeRaw.length)],
        workModelRaw: workModel,
        salaryMin: disclosed ? min : null,
        salaryMax: disclosed ? max : null,
        postedAt: posted.toISOString(),
        externalId: `${country === "US" ? "U" : "X"}${1000 + n}`,
        visa: country === "US" && rand() < 0.25,
      });
      n++;
    }
  }
  return out;
}

/* ---------- encode canonical items into each source's native shape ---------- */
function encodeFor(sourceId, item) {
  const applyUrl = `https://${sourceId.replace("src_", "")}.example/listing/${item.externalId}`;
  switch (sourceId) {
    case "src_jobstream":
      return {
        listing_ref: item.externalId, position: item.title, org_name: item.company,
        town: item.city, ad_text: JSON.stringify(item._desc),
        pay_from: item.salaryMin, pay_to: item.salaryMax, pay_period: "annum",
        contract_kind: item.jobTypeRaw, remote_type: item.workModelRaw,
        listed_on: item.postedAt, target_url: applyUrl,
      };
    case "src_hirewire":
      return {
        id: item.externalId, jobTitle: item.title, employerName: item.company,
        location: { city: item.city }, descriptionHtml: JSON.stringify(item._desc),
        salary: { min: item.salaryMin, max: item.salaryMax, interval: "YEAR" },
        employmentType: item.jobTypeRaw.toUpperCase().replace("-", "_"),
        workplaceType: item.workModelRaw.toUpperCase(),
        publishedAt: item.postedAt, applyUrl,
      };
    case "src_britjobs":
      return {
        guid: item.externalId, job_title: item.title, advertiser: item.company,
        job_location: item.city, job_description: JSON.stringify(item._desc),
        min_annual_salary: item.salaryMin, max_annual_salary: item.salaryMax,
        job_category_type: item.jobTypeRaw.toLowerCase(),
        date_posted: item.postedAt, url: applyUrl,
      };
    case "src_talentfeed":
      return {
        ref: item.externalId, role: item.title, client: item.company,
        place: item.city, details: JSON.stringify(item._desc),
        rate_low: item.salaryMin, rate_high: item.salaryMax, rate_unit: "year",
        kind: item.jobTypeRaw, model: item.workModelRaw,
        live_from: item.postedAt, link: applyUrl,
      };
    case "src_stateside":
      return {
        posting_id: item.externalId, job_name: item.title, hiring_co: item.company,
        metro: item.city, body: JSON.stringify(item._desc),
        comp_min: item.salaryMin, comp_max: item.salaryMax, comp_basis: "yearly",
        engagement: item.jobTypeRaw, site_policy: item.workModelRaw,
        first_listed: item.postedAt, out_link: applyUrl, visa_sponsor: item.visa ? "Y" : "N",
      };
    case "src_libertylist":
      return {
        uid: item.externalId,
        position: { title: item.title, city: item.city, summary: JSON.stringify(item._desc), type: item.jobTypeRaw.toUpperCase(), workplace: item.workModelRaw.toUpperCase() },
        company: { name: item.company },
        compensation: { low: item.salaryMin, high: item.salaryMax, unit: "ANNUAL" },
        listedAt: item.postedAt, applyLink: applyUrl, visaSponsorship: !!item.visa,
      };
    default:
      throw new Error("unknown source " + sourceId);
  }
}

/* Simulated adapter fetch: returns raw items in the source's own shape. */
function fetchRaw(source, market) {
  const share = {
    src_jobstream: [0, 0.34], src_hirewire: [0.34, 0.62], src_britjobs: [0.62, 0.85], src_talentfeed: [0.85, 1],
    src_stateside: [0, 0.55], src_libertylist: [0.55, 1],
  }[source.id];
  const slice = market.slice(Math.floor(share[0] * market.length), Math.floor(share[1] * market.length));
  const items = slice.map((m) => {
    m._desc = buildDescription(m.title, m.company, m.city, m.tier, source.country);
    return encodeFor(source.id, m);
  });
  // Cross-source duplicates: JobStream re-lists two HireWire roles (dedup demo).
  if (source.id === "src_jobstream") {
    const dupes = market.slice(Math.floor(0.34 * market.length), Math.floor(0.34 * market.length) + 2);
    for (const m of dupes) {
      m._desc = buildDescription(m.title, m.company, m.city, m.tier, source.country);
      const enc = encodeFor("src_jobstream", { ...m, externalId: m.externalId + "D" });
      enc.listed_on = new Date(Date.parse(m.postedAt) + 864e5).toISOString(); // listed a day later
      items.push(enc);
    }
  }
  return items;
}

/* ---------- normalisation ---------- */
function getPath(obj, p) {
  if (!p) return null;
  return p.split(".").reduce((o, k) => (o == null ? null : o[k]), obj);
}

function normType(raw) {
  const t = String(raw || "").toLowerCase().replace("_", "-");
  if (t.includes("perm") || t === "full-time") return "permanent";
  if (t.includes("contract")) return "contract";
  if (t.includes("temp")) return "temporary";
  if (t.includes("part")) return "part-time";
  if (t.includes("appren")) return "apprenticeship";
  return "permanent";
}
function normModel(raw, city) {
  const m = String(raw || "").toLowerCase();
  if (m.includes("remote") || m === "wfh") return "remote";
  if (m.includes("hybrid")) return "hybrid";
  if (m.includes("site") || m.includes("office")) return "on-site";
  return city === "Remote" ? "remote" : "on-site";
}
function normPeriod(raw, max) {
  const p = String(raw || "").toLowerCase();
  if (p.includes("hour")) return "hour";
  if (p.includes("day")) return "day";
  if (p.includes("ann") || p.includes("year") || p.includes("salar")) return "year";
  // Source gave no period (e.g. BritJobs): infer from magnitude.
  if (max && max < 400) return "day";
  if (max && max < 60) return "hour";
  return "year";
}

function normalise(raw, source, regionsByCity) {
  const fm = source.field_map;
  const city = getPath(raw, fm.city) || "London";
  const title = getPath(raw, fm.title);
  const min = getPath(raw, fm.salary_min);
  const max = getPath(raw, fm.salary_max);
  let desc;
  try { desc = JSON.parse(getPath(raw, fm.description)); } catch { desc = { intro: String(getPath(raw, fm.description) || ""), responsibilities: [], requirements: [], benefits: [] }; }
  const cls = classify(title);
  return {
    title,
    companyName: getPath(raw, fm.company),
    location: { country: source.country, city, region: regionsByCity[city] || "UK" },
    description: desc,
    salary: {
      min: min || null, max: max || null,
      period: normPeriod(getPath(raw, fm.salary_period), max),
      currency: source.country === "US" ? "USD" : "GBP",
      disclosed: !!(min || max),
    },
    visaSponsorship: source.country === "US" ? (raw.visa_sponsor === "Y" || raw.visaSponsorship === true) : undefined,
    jobType: normType(getPath(raw, fm.job_type)),
    workModel: normModel(getPath(raw, fm.work_model), city),
    specialism: cls.specialism,
    classificationConfidence: cls.confidence,
    postedAt: getPath(raw, fm.posted_at) || new Date().toISOString(),
    source: {
      sourceId: source.id,
      sourceName: source.name,
      externalId: String(getPath(raw, fm.external_id)),
      outboundUrl: getPath(raw, fm.apply_url),
      alsoOn: [],
    },
  };
}

const dedupKey = (j) =>
  `${j.companyName}|${j.title}|${j.location.city}`.toLowerCase().replace(/[^a-z0-9|]+/g, "");

/**
 * Run the full pipeline. directJobs participate only as dedup anchors —
 * an aggregated copy of a direct job is suppressed (direct wins).
 */
export function runPipeline({ directJobs = [], now = Date.now(), country = "UK" } = {}) {
  const locs = country === "US" ? tax.locations_us : tax.locations;
  const regionsByCity = Object.fromEntries(locs.map((l) => [l.city, l.region]));
  const market = synthesiseMarket(now, country);
  const stats = [];
  const byKey = new Map();
  const directKeys = new Set(directJobs.map((d) => dedupKey({ companyName: d.companyName, title: d.title, location: d.location })));
  let suppressed = 0;

  for (const source of sources.filter((s) => s.active && s.country === country)) {
    const raw = fetchRaw(source, market);
    let kept = 0, merged = 0;
    for (const r of raw) {
      const item = normalise(r, source, regionsByCity);
      const key = dedupKey(item);
      if (directKeys.has(key)) { suppressed++; continue; }
      const existing = byKey.get(key);
      if (existing) {
        // Earliest listing stays primary; later source credited as "also on".
        if (Date.parse(item.postedAt) < Date.parse(existing.postedAt)) {
          item.source.alsoOn = [...existing.source.alsoOn, existing.source.sourceName];
          byKey.set(key, item);
        } else if (!existing.source.alsoOn.includes(item.source.sourceName) && existing.source.sourceName !== item.source.sourceName) {
          existing.source.alsoOn.push(item.source.sourceName);
        }
        merged++;
      } else {
        byKey.set(key, item);
        kept++;
      }
    }
    stats.push({
      sourceId: source.id, name: source.name, lastRun: new Date(now).toISOString(),
      itemsIn: raw.length, itemsKept: kept, merged, errors: 0, deadLinks: 0,
    });
  }
  return { jobs: [...byKey.values()], stats, suppressedByDirect: suppressed };
}
