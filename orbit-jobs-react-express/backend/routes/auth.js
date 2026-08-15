/** Auth API: register (candidate/employer fork), sign in, sign out, me. */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { Employers, EmailLog, Users, nextId, nowIso } from "../src/db.js";
import { clearSession, currentUser, publicUser, rateLimit, setSession } from "../src/auth.js";

const router = Router();

const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || "");
const FREE_MAIL = ["gmail.", "outlook.", "hotmail.", "yahoo.", "icloud.", "aol."];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/me", async (req, res, next) => {
  try {
    res.json({ user: publicUser(await currentUser(req)) });
  } catch (ex) { next(ex); }
});

router.post("/register", rateLimit("register", 10, 60_000), async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.website_hp) return res.json({ ok: true }); // honeypot
    const { role, name, email, password, companyName, website } = b;
    if (!["candidate", "employer"].includes(role)) return res.status(400).json({ error: "Choose whether you're looking for a job or hiring." });
    if (!name || String(name).trim().length < 2) return res.status(400).json({ error: "Please enter your name." });
    if (!emailOk(email)) return res.status(400).json({ error: "Please enter a valid email address." });
    if (!password || password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const users = await Users();
    if (await users.findOne({ email: { $regex: `^${escapeRe(email)}$`, $options: "i" } }))
      return res.status(409).json({ error: "An account with that email already exists — try signing in." });

    let employerId = null;
    if (role === "employer") {
      if (!companyName || companyName.trim().length < 2) return res.status(400).json({ error: "Please enter your company name." });
      const freeMail = FREE_MAIL.some((d) => email.toLowerCase().includes("@" + d));
      const emp = {
        id: await nextId("emp"),
        slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.floor(Math.random() * 900 + 100),
        name: companyName.trim(), industry: null, city: null, size: null,
        mark: companyName.trim()[0].toUpperCase(), color: "#4F46B8",
        about: "", website: website || "", country: "UK",
        /* Free-mail registrations are flagged; everyone passes first-post review. */
        verifiedStatus: freeMail ? "flagged" : "pending",
        createdAt: nowIso(),
      };
      await (await Employers()).insertOne({ ...emp });
      employerId = emp.id;
    }

    const user = {
      id: await nextId("usr"), role, name: String(name).trim(), email: String(email).trim(),
      passHash: bcrypt.hashSync(password, 8), verified: true /* demo: email verification auto-passes */,
      sessionVersion: 0, country: "UK",
      employerId,
      profile: role === "candidate" ? { phone: "", desiredSalary: null, preferredLocations: [], workModel: null, noticePeriod: "" } : undefined,
      cvs: role === "candidate" ? [] : undefined,
      marketingConsent: { flag: !!b.marketing, at: nowIso() },
      createdAt: nowIso(),
    };
    await users.insertOne({ ...user });
    await (await EmailLog()).insertOne({ id: await nextId("eml"), template: "verify_email", to: user.email, status: "sent (demo)", at: nowIso() });
    setSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (ex) { next(ex); }
});

router.post("/login", rateLimit("login", 20, 60_000), async (req, res, next) => {
  try {
    const b = req.body || {};
    const email = String(b.email || "");
    const u = await (await Users()).findOne({ email: { $regex: `^${escapeRe(email)}$`, $options: "i" } }, { projection: { _id: 0 } });
    if (!u || !bcrypt.compareSync(String(b.password || ""), u.passHash))
      return res.status(401).json({ error: "That email and password don't match." });
    setSession(res, u);
    res.json({ user: publicUser(u) });
  } catch (ex) { next(ex); }
});

router.post("/logout", (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

export default router;
