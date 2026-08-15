/** Public metadata + content data layer (stats, specialisms, companies, articles). */
import { Articles, Employers, Sources, Testimonials, getTaxonomies } from "./db.js";
import { annualised, liveJobs, publicJob, publicJobs } from "./jobs.js";

export async function marketStats(country) {
  const live = await liveJobs(country);
  const today = live.filter((j) => Date.now() - Date.parse(j.postedAt || "") < 864e5 * 2).length;
  const sources = await (await Sources()).countDocuments({ active: true, country });
  const employers = await (await Employers()).countDocuments({ verifiedStatus: "verified", country });
  return {
    liveJobs: live.length,
    sources: sources + 1, // + direct employers
    addedRecently: today,
    employers,
    disclosedShare: Math.round((live.filter((j) => j.salary.disclosed).length / Math.max(1, live.length)) * 100),
    country,
  };
}

export async function latestJobs(country, limit = 6) {
  const list = (await liveJobs(country))
    .sort((a, b) => Date.parse(b.postedAt || "") - Date.parse(a.postedAt || ""))
    .slice(0, limit);
  return publicJobs(list);
}

export async function specialismPage(slug, country) {
  const tax = await getTaxonomies();
  const s0 = tax.specialisms.find((x) => x.slug === slug);
  if (!s0) return null;
  const s = {
    ...s0,
    intro: country === "US" && s0.intro_us ? s0.intro_us : s0.intro,
    faqs: (s0.faqs || []).filter((f) => (country === "US" ? !f.ukOnly : true)),
  };
  delete s.intro_us;
  const inSpec = (await liveJobs(country)).filter((j) => j.specialism === s.slug);
  const jobs = await publicJobs(
    [...inSpec].sort((a, b) => Date.parse(b.postedAt || "") - Date.parse(a.postedAt || "")).slice(0, 12),
  );

  /* salary snapshot from live index data, minimum sample size 3 per tier */
  const snapshot = ["junior", "mid", "senior", "lead"].map((tier) => {
    const vals = inSpec.filter((j) => j.seniority === tier).map((j) => annualised(j)).filter(Boolean);
    if (vals.length < 3) return null;
    const mids = vals.map((v) => (v.min + v.max) / 2).sort((a, b) => a - b);
    const median = mids[Math.floor(mids.length / 2)];
    return { tier, median: Math.round(median / 500) * 500, sample: vals.length };
  }).filter(Boolean);

  const companies = [...new Set(inSpec.filter((j) => j.class === "direct").map((j) => j.companyName))].slice(0, 6);
  return { specialism: s, jobs, total: inSpec.length, snapshot, companies, country };
}

export async function industryPage(slug, country) {
  const tax = await getTaxonomies();
  const i = tax.industries.find((x) => x.slug === slug);
  if (!i) return null;
  const inInd = (await liveJobs(country)).filter((j) => j.industry === i.slug);
  return {
    industry: i,
    jobs: await publicJobs(
      [...inInd].sort((a, b) => Date.parse(b.postedAt || "") - Date.parse(a.postedAt || "")).slice(0, 9),
    ),
    total: inInd.length,
    others: tax.industries.filter((x) => x.slug !== i.slug).map((x) => ({ slug: x.slug, name: x.name })),
  };
}

export async function companiesDirectory(country, q, industry) {
  const live = await liveJobs(country);
  let list = await (await Employers())
    .find({ verifiedStatus: "verified", country }, { projection: { _id: 0 } })
    .toArray();
  if (q) list = list.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  if (industry) list = list.filter((e) => e.industry === industry);
  return list
    .map((e) => ({
      slug: e.slug, name: e.name, industry: e.industry, city: e.city, size: e.size,
      mark: e.mark, color: e.color,
      liveRoles: live.filter((j) => j.employerId === e.id).length,
    }))
    .sort((a, b) => b.liveRoles - a.liveRoles);
}

export async function companyProfile(slug) {
  const e = await (await Employers()).findOne({ slug }, { projection: { _id: 0 } });
  if (!e) return null;
  const roles = (await liveJobs(e.country || "UK")).filter((j) => j.employerId === e.id);
  return {
    company: {
      slug: e.slug, name: e.name, industry: e.industry, city: e.city, size: e.size,
      mark: e.mark, color: e.color, about: e.about, website: e.website, country: e.country || "UK",
    },
    jobs: await Promise.all(roles.map((j) => publicJob(j))),
  };
}

export async function allArticles() {
  return (await Articles()).find({}, { projection: { _id: 0, body: 0 } }).toArray();
}

export async function articleBySlug(slug) {
  const a = await (await Articles()).findOne({ slug }, { projection: { _id: 0 } });
  if (!a) return null;
  const related = (await allArticles()).filter((x) => x.slug !== slug).slice(0, 3);
  return { article: a, related };
}

export async function allTestimonials() {
  return (await Testimonials()).find({}, { projection: { _id: 0 } }).toArray();
}
