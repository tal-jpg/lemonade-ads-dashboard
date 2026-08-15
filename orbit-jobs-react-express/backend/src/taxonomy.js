/** Shared label maps + market config used by the API layer. */

export const MARKETS = {
  UK: { currency: "GBP", pathPrefix: "", label: "UK Jobs", locale: "en-GB" },
  US: { currency: "USD", pathPrefix: "/us", label: "US Jobs", locale: "en-US" },
};

export const PAY_TRANSPARENCY_STATES = ["New York", "California", "Colorado", "Washington"];
export const JOB_TERM_DAYS = 30;
export const PAGE_SIZE = 20;

export function marketOf(v) {
  return String(v || "").toUpperCase() === "US" ? "US" : "UK";
}
