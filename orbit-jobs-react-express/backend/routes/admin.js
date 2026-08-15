/** Admin API: moderation queues, source manager, listing operations. Every action is audit-logged. */
import { Router } from "express";
import { Applications, AuditLog, EmailLog, Employers, Jobs, Reports, Sources, TalentPool, Users, getTaxonomies, nextId, nowIso } from "../src/db.js";
import { requireRole } from "../src/auth.js";

const router = Router();
router.use(requireRole("admin"));

const audit = async (user, action, target, reason = "") =>
  (await AuditLog()).insertOne({ id: await nextId("aud"), actor: user.email, action, target, at: nowIso(), reason });

router.get("/overview", async (req, res, next) => {
  try {
    const jobs = await Jobs();
    res.json({
      queues: {
        jobsInReview: await jobs.countDocuments({ status: "in_review" }),
        flaggedEmployers: await (await Employers()).countDocuments({ verifiedStatus: { $in: ["flagged", "pending"] } }),
        openReports: await (await Reports()).countDocuments({ status: "open" }),
        lowConfidence: await jobs.countDocuments({ needsReview: true, status: "live" }),
      },
      totals: {
        liveJobs: await jobs.countDocuments({ status: "live" }),
        direct: await jobs.countDocuments({ status: "live", class: "direct" }),
        aggregated: await jobs.countDocuments({ status: "live", class: "aggregated" }),
        employers: await (await Employers()).countDocuments({}),
        candidates: await (await Users()).countDocuments({ role: "candidate" }),
        applications: await (await Applications()).countDocuments({}),
        talentPool: await (await TalentPool()).countDocuments({}),
      },
    });
  } catch (ex) { next(ex); }
});

router.get("/queue", async (req, res, next) => {
  try {
    const jobs = await Jobs();
    const inReview = await jobs.find({ status: "in_review" }, { projection: { _id: 0 } }).toArray();
    const employers = await Employers();
    const queueJobs = [];
    for (const j of inReview) {
      const e = j.employerId ? await employers.findOne({ id: j.employerId }, { projection: { verifiedStatus: 1 } }) : null;
      queueJobs.push({
        id: j.id, title: j.title, companyName: j.companyName, city: j.location.city,
        salary: j.salary, postedAt: j.createdAt, employerStatus: e?.verifiedStatus,
      });
    }
    const openReports = await (await Reports()).find({ status: "open" }, { projection: { _id: 0 } }).toArray();
    const reports = [];
    for (const r of openReports) {
      const j = await jobs.findOne({ id: r.jobId }, { projection: { title: 1, companyName: 1 } });
      reports.push({ ...r, jobTitle: j ? j.title : "(removed)", companyName: j ? j.companyName : "" });
    }
    const lowConfidence = (await jobs.find({ needsReview: true, status: "live" }, { projection: { _id: 0 } }).toArray())
      .map((j) => ({ id: j.id, title: j.title, specialism: j.specialism, source: j.source?.sourceName }));
    res.json({ jobs: queueJobs, reports, lowConfidence });
  } catch (ex) { next(ex); }
});

router.get("/sources", async (req, res, next) => {
  try {
    res.json({ results: await (await Sources()).find({}, { projection: { _id: 0 } }).toArray() });
  } catch (ex) { next(ex); }
});

router.get("/audit", async (req, res, next) => {
  try {
    const results = await (await AuditLog()).find({}, { projection: { _id: 0 } }).toArray();
    res.json({ results: results.reverse().slice(0, 50) });
  } catch (ex) { next(ex); }
});

router.get("/emails", async (req, res, next) => {
  try {
    const results = await (await EmailLog()).find({}, { projection: { _id: 0 } }).toArray();
    res.json({ results: results.reverse().slice(0, 50) });
  } catch (ex) { next(ex); }
});

router.post("/jobs/:id/:action", async (req, res, next) => {
  try {
    const b = req.body || {};
    const jobs = await Jobs();
    const j = await jobs.findOne({ id: req.params.id }, { projection: { _id: 0 } });
    const action = req.params.action;

    if (action === "approve" || action === "reject") {
      if (!j || j.status !== "in_review") return res.status(404).json({ error: `Nothing to ${action}.` });
      if (action === "approve") {
        await jobs.updateOne({ id: j.id }, { $set: { status: "live" } });
        if (j.employerId) {
          await (await Employers()).updateOne({ id: j.employerId, verifiedStatus: { $ne: "verified" } }, { $set: { verifiedStatus: "verified" } });
        }
      } else {
        await jobs.updateOne({ id: j.id }, { $set: { status: "closed" } });
      }
      await audit(req.user, `job.${action}`, j.id, action === "reject" ? String(b.reason || "").slice(0, 300) : "");
      const owner = j.employerId ? await (await Users()).findOne({ employerId: j.employerId }, { projection: { email: 1 } }) : null;
      if (owner) await (await EmailLog()).insertOne({ id: await nextId("eml"), template: action === "approve" ? "job_approved" : "job_rejected", to: owner.email, status: "sent (demo)", at: nowIso() });
      return res.json({ ok: true });
    }

    if (action === "hide") {
      if (!j) return res.status(404).json({ error: "Job not found." });
      await jobs.updateOne({ id: j.id }, { $set: { status: "closed" } });
      await audit(req.user, "job.hide", j.id, String(b.reason || ""));
      return res.json({ ok: true });
    }

    if (action === "reclassify") {
      if (!j) return res.status(404).json({ error: "Job not found." });
      const spec = String(b.specialism || "");
      const tax = await getTaxonomies();
      if (!tax.specialisms.some((s) => s.slug === spec)) return res.status(400).json({ error: "Unknown specialism." });
      await jobs.updateOne({ id: j.id }, { $set: { specialism: spec, needsReview: false } });
      await audit(req.user, "job.reclassify", j.id, spec);
      return res.json({ ok: true });
    }

    res.status(404).json({ error: "Not found" });
  } catch (ex) { next(ex); }
});

router.post("/reports/:id/resolve", async (req, res, next) => {
  try {
    const reports = await Reports();
    const r = await reports.findOne({ id: req.params.id });
    if (!r) return res.status(404).json({ error: "Report not found." });
    await reports.updateOne({ id: r.id }, { $set: { status: "resolved" } });
    await audit(req.user, "report.resolve", r.id, String(req.body?.action || ""));
    res.json({ ok: true });
  } catch (ex) { next(ex); }
});

router.post("/sources/sync", async (req, res, next) => {
  try {
    /* Re-run the aggregation pipeline health pass. The full pipeline lives in
       scripts/aggregate.mjs (seed-time); at runtime we refresh source health
       timestamps so ops can see the sync ran. Production would invoke the
       worker here. */
    const sources = await Sources();
    const all = await sources.find({}).toArray();
    for (const s of all) {
      if (s.health) await sources.updateOne({ id: s.id }, { $set: { "health.lastRun": nowIso() } });
    }
    await audit(req.user, "sources.sync", "all", "manual sync from admin");
    res.json({ ok: true, stats: all.map((s) => s.health).filter(Boolean) });
  } catch (ex) { next(ex); }
});

router.post("/sources/:id/toggle", async (req, res, next) => {
  try {
    const sources = await Sources();
    const s = await sources.findOne({ id: req.params.id });
    if (!s) return res.status(404).json({ error: "Source not found." });
    await sources.updateOne({ id: s.id }, { $set: { active: !s.active } });
    await audit(req.user, !s.active ? "source.enable" : "source.kill_switch", s.id);
    res.json({ ok: true, active: !s.active });
  } catch (ex) { next(ex); }
});

export default router;
