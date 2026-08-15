/** Public metadata + content API (taxonomies, stats, specialisms, companies, articles, testimonials). */
import { Router } from "express";
import { getTaxonomies } from "../src/db.js";
import {
  allArticles, allTestimonials, articleBySlug, companiesDirectory, companyProfile,
  industryPage, latestJobs, marketStats, specialismPage,
} from "../src/meta.js";
import { marketOf } from "../src/taxonomy.js";

const router = Router();
const country = (req) => marketOf(req.query.country);

router.get("/taxonomies", async (req, res, next) => {
  try {
    const c = country(req);
    const t = await getTaxonomies();
    res.json({
      specialisms: t.specialisms.map((s) => ({ slug: s.slug, name: s.name, tint: s.tint })),
      industries: t.industries.map((i) => ({ slug: i.slug, name: i.name })),
      locations: c === "US" ? t.locations_us : t.locations,
      country: c,
    });
  } catch (ex) { next(ex); }
});

router.get("/stats", async (req, res, next) => {
  try { res.json(await marketStats(country(req))); } catch (ex) { next(ex); }
});

router.get("/latest-jobs", async (req, res, next) => {
  try { res.json({ results: await latestJobs(country(req)) }); } catch (ex) { next(ex); }
});

router.get("/specialisms/:slug", async (req, res, next) => {
  try {
    const data = await specialismPage(req.params.slug, country(req));
    if (!data) return res.status(404).json({ error: "Specialism not found." });
    res.json(data);
  } catch (ex) { next(ex); }
});

router.get("/industries/:slug", async (req, res, next) => {
  try {
    const data = await industryPage(req.params.slug, country(req));
    if (!data) return res.status(404).json({ error: "Industry not found." });
    res.json(data);
  } catch (ex) { next(ex); }
});

router.get("/companies", async (req, res, next) => {
  try {
    res.json({ results: await companiesDirectory(country(req), req.query.q || undefined, req.query.industry || undefined) });
  } catch (ex) { next(ex); }
});

router.get("/companies/:slug", async (req, res, next) => {
  try {
    const data = await companyProfile(req.params.slug);
    if (!data) return res.status(404).json({ error: "Company not found." });
    res.json(data);
  } catch (ex) { next(ex); }
});

router.get("/articles", async (req, res, next) => {
  try { res.json({ results: await allArticles() }); } catch (ex) { next(ex); }
});

router.get("/articles/:slug", async (req, res, next) => {
  try {
    const data = await articleBySlug(req.params.slug);
    if (!data) return res.status(404).json({ error: "Article not found." });
    res.json(data);
  } catch (ex) { next(ex); }
});

router.get("/testimonials", async (req, res, next) => {
  try { res.json({ results: await allTestimonials() }); } catch (ex) { next(ex); }
});

export default router;
