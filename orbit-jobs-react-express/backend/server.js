/**
 * Orbit Jobs API server — Express + MongoDB.
 *
 * Serves the REST API under /api, the SEO endpoints (sitemaps + robots.txt),
 * and — when frontend/dist exists (after `npm run build` in ../frontend) —
 * the built React app with an SPA fallback, so production is a single
 * `node server.js` process.
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";

import authRouter from "./routes/auth.js";
import jobsRouter from "./routes/jobs.js";
import meRouter from "./routes/me.js";
import employerRouter from "./routes/employer.js";
import adminRouter from "./routes/admin.js";
import metaRouter from "./routes/meta.js";
import miscRouter from "./routes/misc.js";
import { marketSitemap, sitemapIndex } from "./src/sitemap.js";
import { CV_TYPE_MESSAGE } from "./src/uploads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_DIST = path.join(__dirname, "..", "frontend", "dist");

const app = express();
app.set("trust proxy", true);
app.disable("x-powered-by");

/* CORS — only needed when the frontend calls the API cross-origin
   (the Vite dev proxy makes requests same-origin, so this is a fallback). */
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173", credentials: true }));

app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));

/* ---------------- API ---------------- */
app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/me", meRouter);
app.use("/api/employer", employerRouter);
app.use("/api/admin", adminRouter);
app.use("/api/meta", metaRouter);
app.use("/api", miscRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

/* ---------------- SEO plumbing ---------------- */
app.get("/sitemap.xml", (req, res) => {
  res.set("Content-Type", "application/xml").send(sitemapIndex());
});
app.get("/sitemap-uk.xml", async (req, res, next) => {
  try { res.set("Content-Type", "application/xml").send(await marketSitemap("UK")); } catch (ex) { next(ex); }
});
app.get("/sitemap-us.xml", async (req, res, next) => {
  try { res.set("Content-Type", "application/xml").send(await marketSitemap("US")); } catch (ex) { next(ex); }
});
app.get("/robots.txt", (req, res) => {
  const base = process.env.BASE_URL || `http://localhost:${PORT}`;
  res.set("Content-Type", "text/plain").send(
    ["User-agent: *", "Disallow: /account/", "Disallow: /employers/dashboard", "Disallow: /admin", "Disallow: /api/out/", "Disallow: /api/", "", `Sitemap: ${base}/sitemap.xml`].join("\n"),
  );
});

/* ---------------- built frontend (production) ---------------- */
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST, { maxAge: "1h", index: false }));
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.json({ ok: true, hint: "Orbit Jobs API. Build the frontend (`npm run build` in ../frontend) to serve the app from here, or run the Vite dev server on :5173." });
  });
}

/* ---------------- errors ---------------- */
app.use((err, req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? CV_TYPE_MESSAGE : "Invalid form submission." });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid request body." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side — try again." });
});

app.listen(PORT, () => {
  console.log(`Orbit Jobs API on http://localhost:${PORT}`);
  if (!fs.existsSync(FRONTEND_DIST)) {
    console.log("frontend/dist not found — run the React dev server (`npm run dev` in ../frontend) or build it for production.");
  }
});
