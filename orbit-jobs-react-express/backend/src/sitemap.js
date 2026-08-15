/** Market sitemap builders (sitemap index → per-market files). */
import { Articles, Employers, Jobs, getTaxonomies } from "./db.js";

const BASE_URL = () => process.env.BASE_URL || "http://localhost:4000";

export async function marketSitemap(country) {
  const p = country === "US" ? "/us" : "";
  const urls = [];
  const add = (loc, lastmod) =>
    urls.push(`<url><loc>${BASE_URL()}${loc}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}</url>`);

  add(p || "/"); add(`${p}/jobs`); add(`${p}/companies`);
  if (country === "UK") ["/candidates", "/employers", "/advice", "/about", "/contact"].forEach((x) => add(x));

  const tax = await getTaxonomies();
  tax.specialisms.forEach((s) => add(`${p}/specialisms/${s.slug}`));
  tax.industries.forEach((i) => add(`${p}/industries/${i.slug}`));

  const employers = await (await Employers()).find({ verifiedStatus: "verified", country }, { projection: { slug: 1 } }).toArray();
  employers.forEach((e) => add(`${p}/companies/${e.slug}`));

  const jobs = await (await Jobs()).find({ status: "live", "location.country": country }, { projection: { slug: 1, postedAt: 1 } }).toArray();
  jobs.forEach((j) => add(`${p}/jobs/${j.slug}`, j.postedAt));

  if (country === "UK") {
    const articles = await (await Articles()).find({}, { projection: { slug: 1, date: 1 } }).toArray();
    articles.forEach((a) => add(`/advice/article/${a.slug}`, a.date));
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

export function sitemapIndex() {
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    `<sitemap><loc>${BASE_URL()}/sitemap-uk.xml</loc></sitemap><sitemap><loc>${BASE_URL()}/sitemap-us.xml</loc></sitemap></sitemapindex>`;
}
