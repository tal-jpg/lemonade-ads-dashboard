/** Jobs search page: parse URL params → query → fetch first page → hand to the client view. */
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { Market, SearchResult } from "@/lib/types";
import { JobsSearchView, type SearchState } from "@/components/views/JobsSearchView";
import { Skeletons } from "@/components/JobCard";

export function paramsToState(sp: URLSearchParams): SearchState {
  const first = (k: string) => sp.get(k) || "";
  const list = (k: string) => first(k).split(",").filter(Boolean);
  return {
    q: first("q"), loc: first("loc"),
    type: list("type"), specialism: list("specialism"), industry: list("industry"),
    seniority: list("seniority"), workModel: list("workModel"),
    salaryMin: first("salaryMin"), salaryMax: first("salaryMax"),
    disclosedOnly: first("disclosedOnly") === "1",
    visa: first("visa") === "1",
    posted: first("posted"), source: first("source"),
    sort: first("sort") || "recent",
  };
}

export function JobsSearchPage({ market }: { market: Market }) {
  usePageMeta(
    market === "US" ? "Search US Jobs | Orbit Jobs" : "Search UK Jobs | Orbit Jobs",
    market === "US"
      ? "Search live US jobs across every field. Filter by pay, work model, visa sponsorship and more."
      : "Search live UK jobs across every field. Filter by salary, work model, job type and more — with full salary transparency.",
  );
  const [sp] = useSearchParams();
  const state = paramsToState(sp);

  const { data, loading } = useData(async () => {
    const p = new URLSearchParams(sp);
    p.set("sort", state.sort);
    p.set("page", "1");
    p.set("country", market);
    const [initial, tax] = await Promise.all([
      api<SearchResult>("/jobs?" + p),
      api<{ specialisms: { slug: string; name: string }[] }>(`/meta/taxonomies?country=${market}`),
    ]);
    return { initial, tax };
    // The view manages its own state after mount; this only runs on navigation (remount via key).
  }, [market]);

  if (loading || !data) {
    return (
      <div className="container" style={{ paddingTop: 48 }}>
        <span className="eyebrow">Job search</span>
        <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)" }}>{market === "US" ? "Find your next role in the US" : "Find your next role"}</h1>
        <div style={{ marginTop: 28 }}><Skeletons n={5} /></div>
      </div>
    );
  }

  return (
    <JobsSearchView
      market={market}
      initial={data.initial}
      initialState={state}
      taxonomies={{ specialisms: data.tax.specialisms }}
    />
  );
}
