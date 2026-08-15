/**
 * Public form endpoints + file/redirect routes:
 *   POST /api/alerts       — create a job alert (guest or signed-in)
 *   POST /api/contact      — contact form
 *   POST /api/newsletter   — newsletter signup
 *   POST /api/talent-pool  — quick CV drop-off (multipart)
 *   GET  /api/cv/:file     — CV download (owner / hiring employer / admin only)
 *   GET  /api/out/:jobId   — tracked outbound interstitial for partner listings
 */
import { Router } from "express";
import multer from "multer";
import { Alerts, Contacts, EmailLog, Jobs, Newsletter, TalentPool, Applications, nextId, nowIso } from "../src/db.js";
import { currentUser, rateLimit } from "../src/auth.js";
import { MAX_CV_BYTES, cvPath, saveCV, UploadError } from "../src/uploads.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_CV_BYTES } });
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.post("/alerts", rateLimit("alerts", 15, 60_000), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // honeypot
    const user = await currentUser(req);
    const to = user?.role === "candidate" ? user.email : String(b.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))
      return res.status(400).json({ error: "Please enter a valid email address." });
    const country = ["UK", "US"].includes(String(b.filters?.country || b.country || "").toUpperCase())
      ? String(b.filters?.country || b.country).toUpperCase() : "UK";
    const alert = {
      id: await nextId("alr"),
      candidateId: user?.role === "candidate" ? user.id : null,
      email: to,
      name: String(b.name || "Job alert").slice(0, 80),
      filters: b.filters || {},
      frequency: ["instant", "daily", "weekly"].includes(b.frequency) ? b.frequency : "daily",
      country,
      confirmed: !!user, // double opt-in for guests (demo: recorded, treated as pending)
      active: true,
      createdAt: nowIso(),
      lastSentAt: null,
    };
    await (await Alerts()).insertOne({ ...alert });
    await (await EmailLog()).insertOne({
      id: await nextId("eml"), template: user ? "alert_created" : "alert_confirm_optin",
      to, status: "sent (demo)", at: nowIso(),
    });
    res.json({
      ok: true, alert,
      message: user
        ? "Alert created — you'll get new matching roles by email."
        : "Check your inbox to confirm your alert (double opt-in).",
    });
  } catch (ex) { next(ex); }
});

router.post("/contact", rateLimit("contact", 10, 60_000), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ ok: true }); // honeypot
    if (!b.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email || "") || !b.message)
      return res.status(400).json({ error: "Please complete your name, email and message." });
    await (await Contacts()).insertOne({
      id: await nextId("ctc"), reason: String(b.reason || "general").slice(0, 40),
      name: String(b.name).slice(0, 80), email: String(b.email).slice(0, 200),
      message: String(b.message).slice(0, 3000), at: nowIso(),
    });
    res.json({ ok: true, message: "Thanks — we reply within one working day." });
  } catch (ex) { next(ex); }
});

router.post("/newsletter", rateLimit("newsletter", 10, 60_000), async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Please enter a valid email." });
    const col = await Newsletter();
    const exists = await col.findOne({ email: { $regex: `^${escapeRe(email)}$`, $options: "i" } });
    if (!exists) await col.insertOne({ id: await nextId("nws"), email, at: nowIso() });
    res.json({ ok: true, message: "You're on the list — one email a week, unsubscribe any time." });
  } catch (ex) { next(ex); }
});

router.post("/talent-pool", rateLimit("cvpool", 10, 60_000), upload.single("cv"), async (req, res, next) => {
  try {
    const f = (k) => String(req.body?.[k] ?? "");
    if (f("website")) return res.json({ ok: true }); // honeypot
    if (!f("name") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f("email"))) return res.status(400).json({ error: "Please add your name and a valid email." });
    if (f("consent") !== "1") return res.status(400).json({ error: "Please agree to the privacy notice." });

    let cvFile = null;
    try {
      const saved = saveCV(req.file);
      cvFile = saved?.file || null;
    } catch (ex) {
      if (ex instanceof UploadError) return res.status(400).json({ error: ex.message });
      throw ex;
    }
    if (!cvFile && !f("cvUrl").trim()) return res.status(400).json({ error: "Attach a CV or add a profile link." });

    await (await TalentPool()).insertOne({
      id: await nextId("tal"), name: f("name").slice(0, 80), email: f("email").slice(0, 200),
      specialism: f("specialism").slice(0, 60),
      currentTitle: f("currentTitle").slice(0, 80),
      cvFile,
      cvUrl: f("cvUrl").trim() || null,
      marketing: f("marketing") === "1",
      retentionExpiry: new Date(Date.now() + 365 * 864e5).toISOString(),
      at: nowIso(),
    });
    await (await EmailLog()).insertOne({ id: await nextId("eml"), template: "cv_received", to: f("email"), status: "sent (demo)", at: nowIso() });
    res.json({ ok: true, message: "CV received. We'll match you against new roles — and delete it after 12 months unless you renew." });
  } catch (ex) { next(ex); }
});

/** CV files: served only to the employer who owns the job, the CV's owner, or an admin. */
router.get("/cv/:file", async (req, res, next) => {
  try {
    const file = req.params.file;
    const user = await currentUser(req);
    let allowed = false;
    if (user) {
      if (user.role === "admin") allowed = true;
      else if (user.role === "candidate") allowed = (user.cvs || []).some((c) => c.file === file);
      else if (user.role === "employer") {
        const apps = await (await Applications()).find({ cvFile: file }).toArray();
        for (const a of apps) {
          const j = await (await Jobs()).findOne({ id: a.jobId }, { projection: { employerId: 1 } });
          if (j?.employerId === user.employerId) { allowed = true; break; }
        }
      }
    }
    if (!allowed) return res.status(403).send("Not allowed");
    const full = cvPath(file);
    if (!full) return res.status(404).send("File not found");
    res.download(full, file.split("_").slice(2).join("_") || file);
  } catch (ex) { next(ex); }
});

/** Outbound redirect for aggregated listings: tracked, never masked in the UI.
    Demo destinations are .example URLs, so an interstitial explains the flow. */
router.get("/out/:jobId", async (req, res, next) => {
  try {
    const jobs = await Jobs();
    const j = await jobs.findOne({ id: req.params.jobId }, { projection: { _id: 0 } });
    if (!j || j.class !== "aggregated") return res.status(404).send("Not found");
    await jobs.updateOne({ id: j.id }, { $inc: { outboundClicks: 1 } });
    const clicks = (j.outboundClicks || 0) + 1;
    const dest = j.source?.outboundUrl || "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Leaving Orbit Jobs</title>
<style>body{font-family:system-ui,sans-serif;background:#F7F8FC;display:grid;place-items:center;min-height:100vh;margin:0}
.card{background:#fff;border:1px solid #E3E6EF;border-radius:20px;padding:40px;max-width:520px;text-align:center;box-shadow:0 12px 28px rgba(20,20,43,.12)}
h1{color:#14142B;font-size:22px}p{color:#3F4054;line-height:1.6}code{background:#EEF1F8;padding:2px 8px;border-radius:8px;font-size:13px}
a.btn{display:inline-block;margin-top:16px;background:#4F46B8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600}</style></head>
<body><div class="card"><h1>You're being sent to ${j.source?.sourceName}</h1>
<p>This listing comes from our partner <strong>${j.source?.sourceName}</strong>. You'd complete your application on their site.</p>
<p>In this demo the destination is a placeholder:<br><code>${dest}</code></p>
<p style="font-size:13px;color:#6B6C80">Outbound click tracked (${clicks} total) — this is how partner listings are monetised in Phase&nbsp;3.</p>
<a class="btn" href="/jobs/${j.slug}">Back to the listing</a></div></body></html>`;
    res.set("Content-Type", "text/html; charset=utf-8").send(html);
  } catch (ex) { next(ex); }
});

export default router;
