/**
 * Candidate self-service API:
 *   GET/POST/DELETE /api/me/saves[...]    — shortlist
 *   GET             /api/me/alerts        — my alerts (+ /:id/preview)
 *   PATCH/DELETE    /api/me/alerts/:id    — pause/resume/frequency, delete
 *   GET             /api/me/applications  — tracker
 *   GET/PATCH       /api/me/profile       — profile fields
 *   POST/DELETE     /api/me/cv[/:file]    — CV manager
 *   GET             /api/me/export        — GDPR export
 *   DELETE          /api/me               — account deletion
 */
import { Router } from "express";
import multer from "multer";
import { Alerts, Applications, Jobs, SavedJobs, Users, nextId, nowIso } from "../src/db.js";
import { clearSession, requireRole } from "../src/auth.js";
import { liveJobs, publicJob } from "../src/jobs.js";
import { MAX_CV_BYTES, saveCV, UploadError } from "../src/uploads.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CV_BYTES } });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.use(requireRole("candidate"));

router.get("/saves", async (req, res, next) => {
  try {
    const rows = await (await SavedJobs()).find({ candidateId: req.user.id }).toArray();
    const jobsCol = await Jobs();
    const results = [];
    for (const s of rows) {
      const j = await jobsCol.findOne({ id: s.jobId }, { projection: { _id: 0 } });
      if (j) results.push({ savedAt: s.at, expired: j.status !== "live", job: await publicJob(j) });
    }
    res.json({ results });
  } catch (ex) { next(ex); }
});

router.post("/saves/:jobId", async (req, res, next) => {
  try {
    const j = await (await Jobs()).findOne({ id: req.params.jobId });
    if (!j) return res.status(404).json({ error: "Job not found." });
    const saves = await SavedJobs();
    const exists = await saves.findOne({ candidateId: req.user.id, jobId: j.id });
    if (!exists) await saves.insertOne({ id: await nextId("sav"), candidateId: req.user.id, jobId: j.id, at: nowIso() });
    res.json({ ok: true, saved: true });
  } catch (ex) { next(ex); }
});

router.delete("/saves/:jobId", async (req, res, next) => {
  try {
    await (await SavedJobs()).deleteMany({ candidateId: req.user.id, jobId: req.params.jobId });
    res.json({ ok: true, saved: false });
  } catch (ex) { next(ex); }
});

router.get("/alerts", async (req, res, next) => {
  try {
    const results = await (await Alerts()).find({ candidateId: req.user.id }, { projection: { _id: 0 } }).toArray();
    res.json({ results });
  } catch (ex) { next(ex); }
});

router.get("/alerts/:id/preview", async (req, res, next) => {
  try {
    const a = await (await Alerts()).findOne({ id: req.params.id, candidateId: req.user.id }, { projection: { _id: 0 } });
    if (!a) return res.status(404).json({ error: "Alert not found." });
    const since = Date.parse(a.lastSentAt || a.createdAt) - 7 * 864e5;
    let list = (await liveJobs(a.country || "UK")).filter((j) => Date.parse(j.postedAt || "") >= since);
    const f = a.filters || {};
    if (f.q) list = list.filter((j) => (j.title + " " + j.companyName).toLowerCase().includes(String(f.q).toLowerCase()));
    if (f.specialism) list = list.filter((j) => String(f.specialism).split(",").includes(j.specialism));
    if (f.loc) list = list.filter((j) => j.location.city.toLowerCase().includes(String(f.loc).toLowerCase()) || j.location.region.toLowerCase().includes(String(f.loc).toLowerCase()));
    if (f.workModel) list = list.filter((j) => String(f.workModel).split(",").includes(j.workModel));
    res.json({ results: await Promise.all(list.slice(0, 10).map((j) => publicJob(j))) });
  } catch (ex) { next(ex); }
});

router.patch("/alerts/:id", async (req, res, next) => {
  try {
    const b = req.body || {};
    const alerts = await Alerts();
    const a = await alerts.findOne({ id: req.params.id, candidateId: req.user.id }, { projection: { _id: 0 } });
    if (!a) return res.status(404).json({ error: "Alert not found." });
    const set = {};
    if (typeof b.active === "boolean") set.active = b.active;
    if (b.frequency && ["instant", "daily", "weekly"].includes(String(b.frequency))) set.frequency = b.frequency;
    if (Object.keys(set).length) await alerts.updateOne({ id: a.id }, { $set: set });
    res.json({ ok: true, alert: { ...a, ...set } });
  } catch (ex) { next(ex); }
});

router.delete("/alerts/:id", async (req, res, next) => {
  try {
    await (await Alerts()).deleteMany({ id: req.params.id, candidateId: req.user.id });
    res.json({ ok: true });
  } catch (ex) { next(ex); }
});

router.get("/applications", async (req, res, next) => {
  try {
    const user = req.user;
    const mine = await (await Applications()).find({
      $or: [{ candidateId: user.id }, { email: { $regex: `^${escapeRe(user.email)}$`, $options: "i" } }],
    }, { projection: { _id: 0 } }).toArray();
    const jobsCol = await Jobs();
    const out = [];
    for (const a of mine) {
      const j = await jobsCol.findOne({ id: a.jobId }, { projection: { _id: 0 } });
      out.push({
        id: a.id, status: a.status, appliedAt: a.appliedAt, external: !!a.external,
        statusHistory: a.statusHistory,
        job: j ? { id: j.id, slug: j.slug, title: j.title, companyName: j.companyName, status: j.status } : null,
      });
    }
    out.sort((x, y) => Date.parse(y.appliedAt) - Date.parse(x.appliedAt));
    res.json({ results: out });
  } catch (ex) { next(ex); }
});

router.get("/profile", (req, res) => {
  const user = req.user;
  res.json({
    name: user.name, email: user.email, profile: user.profile || {},
    cvs: (user.cvs || []).map((c) => ({ file: c.file, original: c.original, primary: !!c.primary, uploadedAt: c.uploadedAt })),
  });
});

router.patch("/profile", async (req, res, next) => {
  try {
    const b = req.body || {};
    const p = { ...(req.user.profile || {}) };
    if (b.phone !== undefined) p.phone = String(b.phone).slice(0, 30);
    if (b.desiredSalary !== undefined) p.desiredSalary = Number(b.desiredSalary) || null;
    if (b.preferredLocations !== undefined) p.preferredLocations = [].concat(b.preferredLocations).slice(0, 5);
    if (b.workModel !== undefined) p.workModel = String(b.workModel);
    if (b.noticePeriod !== undefined) p.noticePeriod = String(b.noticePeriod).slice(0, 40);
    await (await Users()).updateOne({ id: req.user.id }, { $set: { profile: p } });
    res.json({ ok: true, profile: p });
  } catch (ex) { next(ex); }
});

router.post("/cv", upload.single("cv"), async (req, res, next) => {
  try {
    let saved = null;
    try { saved = saveCV(req.file); } catch (ex) {
      if (ex instanceof UploadError) return res.status(400).json({ error: ex.message });
      throw ex;
    }
    if (!saved) return res.status(400).json({ error: "Choose a CV file to upload." });
    const cvs = (req.user.cvs || []).map((c) => ({ ...c, primary: false }));
    cvs.push({ file: saved.file, original: saved.original, primary: true, uploadedAt: nowIso() });
    await (await Users()).updateOne({ id: req.user.id }, { $set: { cvs } });
    res.json({ ok: true, cvs });
  } catch (ex) { next(ex); }
});

router.delete("/cv/:file", async (req, res, next) => {
  try {
    const cvs = (req.user.cvs || []).filter((c) => c.file !== req.params.file);
    await (await Users()).updateOne({ id: req.user.id }, { $set: { cvs } });
    res.json({ ok: true });
  } catch (ex) { next(ex); }
});

router.get("/export", async (req, res, next) => {
  try {
    const user = req.user;
    const uid = user.id;
    const data = {
      user: { name: user.name, email: user.email, profile: user.profile, createdAt: user.createdAt },
      savedJobs: await (await SavedJobs()).find({ candidateId: uid }, { projection: { _id: 0 } }).toArray(),
      alerts: await (await Alerts()).find({ candidateId: uid }, { projection: { _id: 0 } }).toArray(),
      applications: await (await Applications()).find({ candidateId: uid }, { projection: { _id: 0 } }).toArray(),
    };
    res.set({
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=orbit-jobs-my-data.json",
    });
    res.send(JSON.stringify(data, null, 2));
  } catch (ex) { next(ex); }
});

router.delete("/", async (req, res, next) => {
  try {
    /* Account deletion: remove personal data, anonymise applications. */
    const uid = req.user.id;
    await (await SavedJobs()).deleteMany({ candidateId: uid });
    await (await Alerts()).deleteMany({ candidateId: uid });
    await (await Applications()).updateMany(
      { candidateId: uid },
      { $set: { name: "Deleted user", email: "deleted@removed", candidateId: null, cvFile: null } },
    );
    await (await Users()).deleteOne({ id: uid });
    clearSession(res);
    res.json({ ok: true, message: "Your account and personal data have been deleted." });
  } catch (ex) { next(ex); }
});

export default router;
