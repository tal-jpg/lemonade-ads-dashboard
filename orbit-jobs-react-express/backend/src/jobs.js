/**
 * Job search + detail data layer.
 *
 * Mongo narrows to live jobs in the market (indexed); the synonym/typo search,
 * salary annualisation, facet counts and sort semantics are then applied in
 * process so behaviour matches the original exactly. At Phase-1 scale (hundreds
 * of live jobs per market) this is single-digit milliseconds; the upgrade path
 * at real scale is Atlas Search for the text stage.
 */
import { Employers, Jobs } from "./db.js";
import { PAGE_SIZE } from "./taxonomy.js";

const SYNONYMS = {
  dev: "developer engineer software", developer: "engineer software",
  engineer: "engineering developer", accountant: "accounting finance",
  finance: "accountant accounting", nurse: "nursing healthcare care",
  hr: "human resources people", marketing: "digital brand content",
  it: "technology software support", ops: "operations", qs: "quantity surveyor",
  teacher: "teaching education", sales: "account business development",
  admin: "administrator administration", pm: "product project manager",
};

function expandQuery(q) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const expanded = new Set(terms);
  for (const t of terms) if (SYNONYMS[t]) SYNONYMS[t].split(" ").forEach((s) => expanded.add(s));
  return [...expanded];
}

function jobHaystack(j) {
  return `${j.title} ${j.companyName} ${j.specialism} ${j.description.intro} ${(j.description.requirements || []).join(" ")}`.toLowerCase();
}

/* very light typo tolerance: a term matches if exact, or (len>4) minus its last char matches */
function termMatches(hay, t) {
  if (hay.includes(t)) return true;
  if (t.length > 4 && hay.includes(t.slice(0, -1))) return true;
  return false;
}

export function annualised(j) {
  const s = j.salary;
  if (!s?.disclosed || !s.max) return null;
  const factor = s.period === "day" ? 225 : s.period === "hour" ? 1950 : 1;
  return { min: (s.min || s.max) * factor, max: s.max * factor };
}

export async function liveJobs(country) {
  return (await Jobs())
    .find({ status: "live", "location.country": country }, { projection: { _id: 0 } })
    .toArray();
}

const employerSlugCache = new Map();
async function employerSlug(employerId) {
  if (!employerId) return null;
  if (!employerSlugCache.has(employerId)) {
    const e = await (await Employers()).findOne({ id: employerId }, { projection: { slug: 1 } });
    employerSlugCache.set(employerId, e?.slug || null);
  }
  return employerSlugCache.get(employerId) || null;
}

export async function publicJob(j) {
  return {
    id: j.id, slug: j.slug, reference: j.reference, title: j.title,
    class: j.class, companyName: j.companyName,
    companySlug: await employerSlug(j.employerId),
    specialism: j.specialism, industry: j.industry, seniority: j.seniority,
    jobType: j.jobType, workModel: j.workModel, location: j.location,
    salary: j.salary, postedAt: j.postedAt, validThrough: j.validThrough,
    status: j.status, country: j.location.country,
    visaSponsorship: j.visaSponsorship || false,
    source: j.source ? { name: j.source.sourceName, alsoOn: j.source.alsoOn || [] } : null,
    applyMethod: j.applyMethod,
    summary: j.description.intro.slice(0, 170) + (j.description.intro.length > 170 ? "…" : ""),
  };
}

export async function publicJobs(list) {
  return Promise.all(list.map((j) => publicJob(j)));
}

export async function publicJobFull(j) {
  const base = await publicJob(j);
  base.description = j.description;
  base.screeningQuestions = j.screeningQuestions || [];
  base.externalApplyUrl = j.class === "aggregated" ? `/api/out/${j.id}` : null;
  base.views = j.views;
  if (j.employerId) {
    const e = await (await Employers()).findOne({ id: j.employerId }, { projection: { _id: 0 } });
    if (e) {
      const liveRoles = await (await Jobs()).countDocuments({
        status: "live", "location.country": e.country || "UK", employerId: e.id,
      });
      base.company = { slug: e.slug, name: e.name, mark: e.mark, color: e.color, about: e.about, industry: e.industry, liveRoles };
    }
  }
  return base;
}

export async function searchJobs(country, q) {
  let list = await liveJobs(country);
  const scores = new Map();

  if (q.q) {
    const terms = expandQuery(String(q.q));
    list = list.filter((j) => {
      const hay = jobHaystack(j);
      const matched = terms.filter((t) => termMatches(hay, t)).length;
      scores.set(j.id, matched);
      return matched > 0;
    });
  }
  if (q.loc) {
    const L = String(q.loc).toLowerCase();
    list = list.filter((j) =>
      j.location.city.toLowerCase().includes(L) ||
      j.location.region.toLowerCase().includes(L) ||
      (L.includes("remote") && j.workModel === "remote"),
    );
  }
  const multi = (v) => (v ? String(v).split(",").filter(Boolean) : null);
  const type = multi(q.type); if (type) list = list.filter((j) => type.includes(j.jobType));
  const spec = multi(q.specialism); if (spec) list = list.filter((j) => spec.includes(j.specialism));
  const ind = multi(q.industry); if (ind) list = list.filter((j) => ind.includes(j.industry || ""));
  const sen = multi(q.seniority); if (sen) list = list.filter((j) => sen.includes(j.seniority));
  const wm = multi(q.workModel); if (wm) list = list.filter((j) => wm.includes(j.workModel));
  if (q.source === "direct") list = list.filter((j) => j.class === "direct");
  if (q.source === "partner") list = list.filter((j) => j.class === "aggregated");
  if (q.disclosedOnly === "1") list = list.filter((j) => j.salary.disclosed);
  if (q.visa === "1" && country === "US") list = list.filter((j) => j.visaSponsorship);
  if (q.salaryMin || q.salaryMax) {
    const mn = Number(q.salaryMin) || 0, mx = Number(q.salaryMax) || Infinity;
    list = list.filter((j) => {
      const a = annualised(j);
      if (!a) return false; // salary filters imply disclosed
      return a.max >= mn && a.min <= mx;
    });
  }
  if (q.posted) {
    const d = { "1": 1, "3": 3, "7": 7, "14": 14, "30": 30 }[q.posted];
    if (d) list = list.filter((j) => Date.now() - Date.parse(j.postedAt || "") <= d * 864e5);
  }

  const sort = q.sort || "recent";
  const recency = (a, b) => Date.parse(b.postedAt || "") - Date.parse(a.postedAt || "");
  const cmp = {
    recent: recency,
    relevance: (a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0) || recency(a, b),
    "salary-desc": (a, b) => (annualised(b)?.max ?? -1) - (annualised(a)?.max ?? -1),
    "salary-asc": (a, b) => (annualised(a)?.max ?? Infinity) - (annualised(b)?.max ?? Infinity),
  };
  list = [...list].sort(cmp[sort] || recency);
  // undisclosed always last in salary sorts
  if (sort.startsWith("salary")) {
    list = [...list.filter((j) => annualised(j)), ...list.filter((j) => !annualised(j))];
  }

  const page = Math.max(1, Number(q.page) || 1);
  const total = list.length;
  const results = await publicJobs(list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

  const counts = { jobType: {}, specialism: {}, workModel: {}, class: { direct: 0, aggregated: 0 } };
  for (const j of list) {
    counts.jobType[j.jobType] = (counts.jobType[j.jobType] || 0) + 1;
    counts.specialism[j.specialism] = (counts.specialism[j.specialism] || 0) + 1;
    counts.workModel[j.workModel] = (counts.workModel[j.workModel] || 0) + 1;
    counts.class[j.class] += 1;
  }

  return { total, page, pageSize: PAGE_SIZE, results, counts };
}

export async function jobByIdOrSlug(idOrSlug) {
  return (await Jobs()).findOne(
    { $or: [{ id: idOrSlug }, { slug: idOrSlug }] },
    { projection: { _id: 0 } },
  );
}

export async function similarJobs(j, limit = 6) {
  const live = await liveJobs(j.location.country);
  const scored = live
    .filter((x) => x.id !== j.id)
    .map((x) => ({
      x,
      s: (x.specialism === j.specialism ? 4 : 0) + (x.location.city === j.location.city ? 2 : 0) +
        (x.seniority === j.seniority ? 1 : 0) + (x.workModel === j.workModel ? 1 : 0),
    }))
    .filter((r) => r.s >= 4)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.x);
  return publicJobs(scored);
}
