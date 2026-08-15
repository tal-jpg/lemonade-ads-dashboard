/**
 * Job search, detail + actions:
 *   GET  /api/jobs                        — the search endpoint
 *   GET  /api/jobs/:idOrSlug              — full public job (410 payload when closed)
 *   GET  /api/jobs/:idOrSlug/similar      — scored similar live roles
 *   POST /api/jobs/:idOrSlug/report       — report a listing
 *   POST /api/jobs/:idOrSlug/apply        — native apply (multipart, optional CV)
 *   POST /api/jobs/:idOrSlug/log-external-apply — track a partner-site application
 */
import { Router } from "express";
import multer from "multer";
import { Applications, EmailLog, Jobs, Reports, nextId, nowIso } from "../src/db.js";
import { jobByIdOrSlug, liveJobs, publicJob, publicJobFull, searchJobs, similarJobs } from "../src/jobs.js";
import { currentUser, rateLimit } from "../src/auth.js";
import { MAX_CV_BYTES, saveCV, UploadError } from "../src/uploads.js";
import { marketOf } from "../src/taxonomy.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CV_BYTES } });

router.get("/", async (req, res, next) => {
  try {
    res.json(await searchJobs(marketOf(req.query.country), req.query));
  } catch (ex) { next(ex); }
});

router.get("/:idOrSlug", async (req, res, next) => {
  try {
    const j = await jobByIdOrSlug(req.params.idOrSlug);
    if (!j) return res.status(404).json({ error: "Job not found." });
    if (j.status !== "live") {
      const similar = (await liveJobs(j.location.country))
        .filter((x) => x.specialism === j.specialism && x.id !== j.id)
        .slice(0, 3);
      return res.status(410).json({
        gone: true,
        job: { title: j.title, companyName: j.companyName, specialism: j.specialism, country: j.location.country },
        similar: await Promise.all(similar.map((x) => publicJob(x))),
      });
    }
    await (await Jobs()).updateOne({ id: j.id }, { $inc: { views: 1 } });
    res.json({ job: await publicJobFull(j) });
  } catch (ex) { next(ex); }
});

router.get("/:idOrSlug/similar", async (req, res, next) => {
  try {
    const j = await jobByIdOrSlug(req.params.idOrSlug);
    if (!j) return res.status(404).json({ error: "Job not found." });
    res.json({ results: await similarJobs(j) });
  } catch (ex) { next(ex); }
});

router.post("/:idOrSlug/report", async (req, res, next) => {
  try {
    const j = await jobByIdOrSlug(req.params.idOrSlug);
    if (!j) return res.status(404).json({ error: "Job not found." });
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // honeypot
    const reason = String(b.reason || "").slice(0, 500);
    if (!reason) return res.status(400).json({ error: "Please tell us what's wrong with the listing." });
    await (await Reports()).insertOne({
      id: await nextId("rep"), jobId: j.id, reason,
      email: String(b.email || "").slice(0, 200), status: "open", at: nowIso(),
    });
    res.json({ ok: true, message: "Thanks — our team reviews reports within one working day." });
  } catch (ex) { next(ex); }
});

router.post("/:idOrSlug/apply", rateLimit("apply", 20, 60_000), upload.single("cv"), async (req, res, next) => {
  try {
    const j = await jobByIdOrSlug(req.params.idOrSlug);
    if (!j) return res.status(404).json({ error: "Job not found." });
    if (j.status !== "live") return res.status(410).json({ error: "This role has closed." });
    if (j.class !== "direct") return res.status(400).json({ error: "This listing is applied to on the source site." });

    const f = (k) => String(req.body?.[k] ?? "");
    if (f("website")) return res.json({ ok: true }); // honeypot

    const user = await currentUser(req);
    const useProfile = f("useProfile") === "1" && user?.role === "candidate";
    const name = useProfile ? user.name : `${f("firstName").trim()} ${f("lastName").trim()}`.trim();
    const email = useProfile ? user.email : f("email").trim();
    if (!name || name.length < 3) return res.status(400).json({ error: "Please enter your full name." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Please enter a valid email address." });
    if (f("consent") !== "1") return res.status(400).json({ error: "Please agree to the privacy notice to apply." });

    let cvFile = null;
    try {
      const saved = saveCV(req.file);
      cvFile = saved?.file || null;
    } catch (ex) {
      if (ex instanceof UploadError) return res.status(400).json({ error: ex.message });
      throw ex;
    }
    let cvUrl = f("cvUrl").trim() || null;
    if (useProfile && !cvFile && !cvUrl) {
      const primary = (user.cvs || []).find((c) => c.primary) || (user.cvs || [])[0];
      if (primary) cvFile = primary.file;
    }
    if (!cvFile && !cvUrl) return res.status(400).json({ error: "Attach a CV or add a profile link so the employer can assess you." });

    let screeningAnswers = [];
    try { screeningAnswers = JSON.parse(f("answers") || "[]"); } catch { /* ignore */ }

    const now = nowIso();
    const app = {
      id: await nextId("app"), jobId: j.id,
      candidateId: user?.role === "candidate" ? user.id : null,
      name, email, phone: f("phone").slice(0, 30),
      cvFile, cvUrl, message: f("message").slice(0, 2000),
      screeningAnswers, status: "submitted",
      statusHistory: [{ status: "submitted", at: now }],
      source: f("src") || "search", appliedAt: now,
    };
    await (await Applications()).insertOne({ ...app });
    await (await Jobs()).updateOne({ id: j.id }, { $inc: { applies: 1 } });
    await (await EmailLog()).insertOne({ id: await nextId("eml"), template: "apply_confirmation", to: email, status: "sent (demo)", at: now });
    res.json({
      ok: true, applicationId: app.id,
      message: "Application sent. The employer usually responds within 5 working days — we'll email you when your status changes.",
    });
  } catch (ex) { next(ex); }
});

router.post("/:idOrSlug/log-external-apply", async (req, res, next) => {
  try {
    const j = await jobByIdOrSlug(req.params.idOrSlug);
    if (!j) return res.status(404).json({ error: "Job not found." });
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "Sign in required." });
    if (user.role !== "candidate") return res.status(403).json({ error: "Not allowed." });
    const now = nowIso();
    await (await Applications()).insertOne({
      id: await nextId("app"), jobId: j.id, candidateId: user.id,
      name: user.name, email: user.email, phone: "",
      cvFile: null, cvUrl: null, message: "", screeningAnswers: [],
      status: "submitted", statusHistory: [{ status: "submitted", at: now }],
      external: true, source: "external", appliedAt: now,
    });
    res.json({ ok: true, message: "Logged — you can track this application in your dashboard." });
  } catch (ex) { next(ex); }
});

export default router;
