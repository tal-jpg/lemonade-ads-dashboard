/** Companies directory — SSR initial grid, client-side search/industry filtering. */
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { mhref } from "@/lib/taxonomy";
import type { CompanyCard, Market } from "@/lib/types";
import { IconChevR } from "@/lib/icons";
import { Skeletons } from "@/components/JobCard";

export function CompaniesGrid({ market, initial, industries }: {
  market: Market;
  initial: CompanyCard[];
  industries: { slug: string; name: string }[];
}) {
  const m = (p: string) => mhref(market, p);
  const [list, setList] = useState<CompanyCard[]>(initial);
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState("");
  const qRef = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const seq = useRef(0);

  async function refresh(q: string, ind: string) {
    const my = ++seq.current;
    setLoading(true);
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (ind) p.set("industry", ind);
    p.set("country", market);
    try {
      const { results } = await api<{ results: CompanyCard[] }>("/meta/companies?" + p);
      if (my === seq.current) setList(results);
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }

  return (
    <>
      <div className="hero"><div className="container split-2" style={{ paddingTop: 52, paddingBottom: 44 }}>
        <div>
          <span className="eyebrow">Companies</span>
          <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", maxWidth: "16ch" }}>Companies hiring <span className="hl-teal">on Orbit</span></h1>
          <p className="hero-sub">Verified employers who post direct — native applications, real profiles, no mystery.</p>
          <div className="controls-row">
            <input type="search" placeholder="Search companies" aria-label="Search companies" onChange={(e) => {
              qRef.current = e.target.value;
              clearTimeout(timer.current);
              timer.current = setTimeout(() => refresh(qRef.current, industry), 350);
            }} />
            <select aria-label="Filter by industry" value={industry} onChange={(e) => { setIndustry(e.target.value); refresh(qRef.current, e.target.value); }}>
              <option value="">All industries</option>
              {industries.map((i) => <option key={i.slug} value={i.slug}>{i.name}</option>)}
            </select>
          </div>
        </div>
        <img className="photo-panel m-hide" src="/media/img-network.webp" alt="Hiring teams talking in an office overlooking the city at sunset" loading="lazy" />
      </div></div>
      <div className="container" style={{ marginTop: 28 }}>
        <div className="tile-grid">
          {loading ? <Skeletons n={6} /> : list.length === 0 ? (
            <div className="empty"><p className="muted">No companies match — try clearing the filters.</p></div>
          ) : list.map((c) => (
            <a key={c.slug} className="card co-card" href={m(`/companies/${c.slug}`)}>
              <div className="co-top"><span className="jc-logo" style={{ background: c.color }}>{c.mark}</span><span className="jr-arrow" aria-hidden="true"><IconChevR /></span></div>
              <span className="jr-sector">{(c.industry || "").replace(/-/g, " ")}</span>
              <h4 style={{ margin: 0 }}>{c.name}</h4>
              <p className="small muted" style={{ margin: 0 }}>{c.city || ""}{c.size ? (c.city ? " · " : "") + c.size + " people" : ""}</p>
              <div className="co-foot"><strong>{c.liveRoles} live role{c.liveRoles === 1 ? "" : "s"}</strong></div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
