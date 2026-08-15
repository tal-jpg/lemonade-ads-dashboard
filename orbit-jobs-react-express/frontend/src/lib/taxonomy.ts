/** Shared label maps + market config. Safe to import from server and client code. */
import type { Market } from "./types";

export const SPEC_NAMES: Record<string, string> = {
  technology: "Technology",
  "finance-and-accounting": "Finance & Accounting",
  sales: "Sales",
  marketing: "Marketing",
  engineering: "Engineering",
  healthcare: "Healthcare",
  "human-resources": "Human Resources",
  "operations-and-supply-chain": "Operations & Supply Chain",
  legal: "Legal",
  "customer-experience": "Customer Experience",
  education: "Education",
  construction: "Construction",
};
export const NAV_SPECIALISMS = Object.entries(SPEC_NAMES);

export const TYPE_NAMES: Record<string, string> = {
  permanent: "Permanent", contract: "Contract", temporary: "Temporary",
  "part-time": "Part-time", apprenticeship: "Apprenticeship",
};
export const MODEL_NAMES: Record<string, string> = { "on-site": "On-site", hybrid: "Hybrid", remote: "Remote" };
export const SEN_NAMES: Record<string, string> = {
  junior: "Junior / entry", mid: "Mid-level", senior: "Senior", lead: "Lead / head of",
};

export const MARKETS: Record<Market, { currency: "GBP" | "USD"; pathPrefix: string; label: string; locale: string }> = {
  UK: { currency: "GBP", pathPrefix: "", label: "UK Jobs", locale: "en-GB" },
  US: { currency: "USD", pathPrefix: "/us", label: "US Jobs", locale: "en-US" },
};

export const PAY_TRANSPARENCY_STATES = ["New York", "California", "Colorado", "Washington"];
export const JOB_TERM_DAYS = 30;
export const PAGE_SIZE = 20;

export const UK_CITY_SUGGESTIONS = ["London", "Manchester", "Birmingham", "Leeds", "Bristol", "Edinburgh", "Glasgow", "Cardiff", "Belfast", "Remote"];
export const US_CITY_SUGGESTIONS = ["New York", "San Francisco", "Los Angeles", "Austin", "Chicago", "Boston", "Seattle", "Denver", "Atlanta", "Miami", "Remote"];

export function marketOf(v: string | null | undefined): Market {
  return String(v || "").toUpperCase() === "US" ? "US" : "UK";
}

/** Market-scoped href: prefixes /us onto market-scoped sections only. */
const SCOPED = ["/jobs", "/specialisms", "/industries", "/companies"];
const NEUTRAL = ["/jobs/saved"];
export function mhref(market: Market, p: string): string {
  if (market !== "US") return p;
  if (p === "/") return "/us";
  if (NEUTRAL.some((n) => p === n || p.startsWith(n + "?"))) return p;
  if (SCOPED.some((sec) => p === sec || p.startsWith(sec + "/") || p.startsWith(sec + "?"))) return "/us" + p;
  return p;
}
