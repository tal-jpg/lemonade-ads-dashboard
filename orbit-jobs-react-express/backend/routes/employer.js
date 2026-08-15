/**
 * Employer API: posting wizard with drafts, listing management, applicant
 * pipeline, CSV export, company profile.
 */
import { Router } from "express";
import { Applications, AuditLog, EmailLog, Employers, Jobs, getTaxonomies, nextId, nowIso } from "../src/db.js";
import { requireRole } from "../src/auth.js";
import { JOB_TERM_DAYS, MARKETS, PAY_TRANSPARENCY_STATES } from "../src/taxonomy.js";

const router = Router();

const slugify = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const iso = (d) => new Date(d).toISOString();

const VALID = {
  jobType: ["permanent", "contract", "temporary", "part-time", "apprenticeship"],
  workModel: ["on-site", "hybrid", "remote"],
  seniority: ["entry", "junior", "mid", "senior", "lead", "executive"],
  period: ["year", "day", "hour"],
};

async function locationsFor(country) {
  const t = await getTaxonomies();
  return (country === "US" ? t.locations_us : t.locations) || [];
}
async function regionFor(city, country) {
  const hit = (await locationsFor(country)).find((l) => l.city === city);
  return hit ? hit.region : country;
}

async function validateJob(b) {
  const errs = [];
  const country = MARKETS[b.country] ? b.country : "UK";
  const title = String(b.title || "");
  if (!title || title.trim().length < 3) errs.push("Job title is required.");
  if (!b.specialism) errs.push("Choose a specialism.");
  const city = String(b.city || "");
  if (!city) errs.push("Choose a location (or Remote).");
  else if (!(await locationsFor(country)).some((l) => l.city === city)) errs.push(`Choose a ${country} location from the list.`);
  /* US state pay-transparency laws: range required in listed states */
  if (country === "US" && !b.salaryDisclosed) {
    const region = await regionFor(city, "US");
    if (PAY_TRANSPARENCY_STATES.includes(region))
      errs.push(`${region} requires a published pay range on job postings — add the range to publish this role.`);
  }
  if (!VALID.jobType.includes(String(b.jobType))) errs.push("Choose a job type.");
  if (!VALID.workModel.includes(String(b.workModel))) errs.push("Choose a work model.");
  if (!b.descriptionIntro || String(b.descriptionIntro).trim().length < 40) errs.push("Describe the role (at least a short paragraph).");
  if (b.salaryDisclosed) {
    if (!(Number(b.salaryMin) > 0) || !(Number(b.salaryMax) >= Number(b.salaryMin))) errs.push("Enter a valid salary range (min and max).");
    if (!VALID.period.includes(String(b.salaryPeriod))) errs.push("Choose a salary period.");
  }
  if (b.applyMethod === "external" && !/^https?:\/\/.+/.test(String(b.externalApplyUrl || ""))) errs.push("External applications need a valid URL.");
  return errs;
}

async function jobFromBody(b, emp, existing) {
  const jid = existing ? existing.id : await nextId("job");
  const now = Date.now();
  const country = MARKETS[b.country] ? b.country : (emp.country || "UK");
  const city = String(b.city || (country === "US" ? "New York" : "London"));
  const strArr = (v) => [].concat(v || []).map((s) => String(s).slice(0, 300)).filter(Boolean).slice(0, 10);
  return {
    ...(existing || {}),
    id: jid,
    slug: existing?.slug || `${slugify(String(b.title || "role"))}-${slugify(emp.name)}-${jid.slice(-4)}`,
    reference: existing?.reference || `OJ-${jid.slice(-5)}`,
    title: String(b.title || "").trim().slice(0, 90),
    class: "direct", employerId: emp.id, companyName: emp.name,
    specialism: String(b.specialism || ""), industry: b.industry || emp.industry || null,
    seniority: VALID.seniority.includes(String(b.seniority)) ? b.seniority : "mid",
    jobType: VALID.jobType.includes(String(b.jobType)) ? b.jobType : "permanent",
    workModel: VALID.workModel.includes(String(b.workModel)) ? b.workModel : "on-site",
    location: { country, city, region: await regionFor(city, country) },
    salary: {
      min: b.salaryDisclosed ? Number(b.salaryMin) || null : null,
      max: b.salaryDisclosed ? Number(b.salaryMax) || null : null,
      period: VALID.period.includes(String(b.salaryPeriod)) ? b.salaryPeriod : "year",
      currency: MARKETS[country].currency, disclosed: !!b.salaryDisclosed,
    },
    visaSponsorship: country === "US" ? !!b.visaSponsorship : undefined,
    description: {
      intro: String(b.descriptionIntro || "").slice(0, 2000),
      responsibilities: strArr(b.responsibilities),
      requirements: strArr(b.requirements),
      benefits: strArr(b.benefits),
    },
    screeningQuestions: [].concat(b.screeningQuestions || []).slice(0, 3)
      .map((q) => ({ q: String(q?.q || q).slice(0, 300), kind: q?.kind === "yesno" ? "yesno" : "text" }))
      .filter((q) => q.q),
    applyMethod: b.applyMethod === "external" ? "external" : "native",
    externalApplyUrl: b.applyMethod === "external" ? String(b.externalApplyUrl).slice(0, 400) : null,
    status: existing?.status || "draft",
    postedAt: existing?.postedAt || null,
    validThrough: existing?.validThrough || null,
    views: existing?.views || 0, applies: existing?.applies || 0,
    featuredFlag: false,
    createdAt: existing?.createdAt || iso(now),
  };
}

/* Gate: employer role + company loaded onto the request. */
router.use(requireRole("employer"), async (req, res, next) => {
  try {
    const emp = await (await Employers()).findOne({ id: req.user.employerId || "" }, { projection: { _id: 0 } });
    if (!emp) return res.status(400).json({ error: "No company on this account." });
    req.emp = emp;
    next();
  } catch (ex) { next(ex); }
});

const audit = async (actor, action, target, reason = "") =>
  (await AuditLog()).insertOne({ id: await nextId("aud"), actor, action, target, at: nowIso(), reason });

router.get("/company", (req, res) => {
  res.json({ company: req.emp });
});

router.patch("/company", async (req, res, next) => {
  try {
    const b = req.body || {};
    const set = {};
    if (b.about !== undefined) set.about = String(b.about).slice(0, 2000);
    if (b.website !== undefined) set.website = String(b.website).slice(0, 200);
    if (b.industry !== undefined) set.industry = b.industry;
    if (b.city !== undefined) set.city = String(b.city).slice(0, 60);
    if (b.size !== undefined) set.size = String(b.size).slice(0, 30);
    await (await Employers()).updateOne({ id: req.emp.id }, { $set: set });
    res.json({ ok: true, company: { ...req.emp, ...set } });
  } catch (ex) { next(ex); }
});

router.get("/jobs", async (req, res, next) => {
  try {
    const emp = req.emp;
    const mine = (await (await Jobs()).find({ employerId: emp.id }, { projection: { _id: 0 } }).toArray())
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((j) => ({
        id: j.id, slug: j.slug, title: j.title, status: j.status,
        city: j.location.city, jobType: j.jobType, salary: j.salary,
        postedAt: j.postedAt, validThrough: j.validThrough,
        views: j.views, applies: j.applies,
      }));
    const totals = {
      live: mine.filter((j) => j.status === "live").length,
      views: mine.reduce((s, j) => s + (j.views || 0), 0),
      applies: mine.reduce((s, j) => s + (j.applies || 0), 0),
    };
    res.json({ company: { name: emp.name, slug: emp.slug, verifiedStatus: emp.verifiedStatus }, totals, results: mine });
  } catch (ex) { next(ex); }
});

router.post("/jobs/draft", async (req, res, next) => {
  try {
    const b = req.body || {};
    const jobs = await Jobs();
    const existing = b.id ? await jobs.findOne({ id: String(b.id), employerId: req.emp.id }, { projection: { _id: 0 } }) : null;
    if (b.id && !existing) return res.status(404).json({ error: "Draft not found." });
    const job = await jobFromBody(b, req.emp, existing);
    if (!existing) await jobs.insertOne({ ...job });
    else await jobs.replaceOne({ id: job.id }, { ...job });
    res.json({ ok: true, id: job.id, status: job.status });
  } catch (ex) { next(ex); }
});

router.post("/jobs/publish", async (req, res, next) => {
  try {
    const b = req.body || {};
    const errs = await validateJob(b);
    if (errs.length) return res.status(400).json({ error: errs[0], errors: errs });
    const jobs = await Jobs();
    const existing = b.id ? await jobs.findOne({ id: String(b.id), employerId: req.emp.id }, { projection: { _id: 0 } }) : null;
    const job = await jobFromBody(b, req.emp, existing);
    const now = Date.now();

    /* First-ever posting from a new employer goes to moderation. */
    const hasLiveHistory = !!(await jobs.findOne({ employerId: req.emp.id, status: { $in: ["live", "expired", "closed"] } }));
    const needsReview = !hasLiveHistory || req.emp.verifiedStatus === "flagged";
    job.status = needsReview ? "in_review" : "live";
    job.postedAt = iso(now);
    job.validThrough = iso(now + JOB_TERM_DAYS * 864e5);

    if (!existing) await jobs.insertOne({ ...job });
    else await jobs.replaceOne({ id: job.id }, { ...job });
    await audit(req.user.email, needsReview ? "job.submit_for_review" : "job.publish", job.id);
    res.json({
      ok: true, id: job.id, slug: job.slug, status: job.status,
      message: needsReview
        ? "Submitted for review — first postings are usually approved within a few working hours. We'll email you when it's live."
        : "Your job is live.",
    });
  } catch (ex) { next(ex); }
});

router.get("/jobs/:id", async (req, res, next) => {
  try {
    const j = await (await Jobs()).findOne({ id: req.params.id, employerId: req.emp.id }, { projection: { _id: 0 } });
    if (!j) return res.status(404).json({ error: "Job not found." });
    res.json({ job: j });
  } catch (ex) { next(ex); }
});

async function applicantsFor(req, res) {
  const j = await (await Jobs()).findOne({ id: req.params.id, employerId: req.emp.id }, { projection: { _id: 0 } });
  if (!j) {
    res.status(404).json({ error: "Job not found." });
    return null;
  }
  const apps = (await (await Applications()).find({ jobId: j.id }, { projection: { _id: 0 } }).toArray())
    .sort((a, b) => Date.parse(b.appliedAt) - Date.parse(a.appliedAt));
  return { j, apps };
}

router.get("/jobs/:id/applicants", async (req, res, next) => {
  try {
    const data = await applicantsFor(req, res);
    if (!data) return;
    const { j, apps } = data;
    res.json({
      job: { id: j.id, title: j.title, status: j.status },
      results: apps.map((a) => ({
        id: a.id, name: a.name, email: a.email, phone: a.phone,
        cvFile: a.cvFile ? `/api/cv/${a.cvFile}` : null, cvUrl: a.cvUrl,
        message: a.message, screeningAnswers: a.screeningAnswers,
        status: a.status, statusHistory: a.statusHistory, appliedAt: a.appliedAt,
      })),
    });
  } catch (ex) { next(ex); }
});

router.get("/jobs/:id/applicants.csv", async (req, res, next) => {
  try {
    const data = await applicantsFor(req, res);
    if (!data) return;
    const { j, apps } = data;
    const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
    const rows = [
      ["Name", "Email", "Phone", "Status", "Applied", "CV", "Message"].join(","),
      ...apps.map((a) => [esc(a.name), esc(a.email), esc(a.phone), esc(a.status), esc(a.appliedAt), esc(a.cvUrl || a.cvFile || ""), esc(a.message)].join(",")),
    ];
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${j.slug}-applicants.csv`,
    });
    res.send(rows.join("\r\n"));
  } catch (ex) { next(ex); }
});

router.post("/jobs/:id/:action", async (req, res, next) => {
  try {
    const jobs = await Jobs();
    const j = await jobs.findOne({ id: req.params.id, employerId: req.emp.id }, { projection: { _id: 0 } });
    if (!j) return res.status(404).json({ error: "Job not found." });
    const a = req.params.action;
    const now = Date.now();
    let status = j.status;
    if (a === "pause" && j.status === "live") status = "paused";
    else if (a === "resume" && j.status === "paused") status = "live";
    else if (a === "close" && ["live", "paused", "in_review", "draft"].includes(j.status)) status = "closed";
    else if (a === "repost" && ["expired", "closed"].includes(j.status)) {
      await jobs.updateOne({ id: j.id }, { $set: { status: "live", postedAt: iso(now), validThrough: iso(now + JOB_TERM_DAYS * 864e5) } });
      await audit(req.user.email, `job.${a}`, j.id);
      return res.json({ ok: true, status: "live" });
    } else return res.status(400).json({ error: `Can't ${a} a ${j.status} listing.` });
    await jobs.updateOne({ id: j.id }, { $set: { status } });
    await audit(req.user.email, `job.${a}`, j.id);
    res.json({ ok: true, status });
  } catch (ex) { next(ex); }
});

const APP_STATUSES = ["submitted", "viewed", "shortlisted", "contacted", "rejected"];

router.patch("/applications/:id", async (req, res, next) => {
  try {
    const b = req.body || {};
    const apps = await Applications();
    const a = await apps.findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!a) return res.status(404).json({ error: "Application not found." });
    const j = await (await Jobs()).findOne({ id: a.jobId }, { projection: { employerId: 1 } });
    if (!j || j.employerId !== req.emp.id) return res.status(403).json({ error: "Not your applicant." });
    const s = String(b.status || "");
    if (!APP_STATUSES.includes(s)) return res.status(400).json({ error: "Unknown status." });
    const push = { statusHistory: { status: s, at: nowIso() } };
    if (b.note) push.notes = { note: String(b.note).slice(0, 500), at: nowIso() };
    await apps.updateOne({ id: a.id }, { $set: { status: s }, $push: push });
    /* Status change notifies the candidate (kind, generic template). */
    await (await EmailLog()).insertOne({ id: await nextId("eml"), template: `status_${s}`, to: a.email, status: "sent (demo)", at: nowIso() });
    res.json({ ok: true, status: s });
  } catch (ex) { next(ex); }
});

export default router;
