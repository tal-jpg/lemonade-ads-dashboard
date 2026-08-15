/** Advice index — article list with client topic filtering. */
import { useState } from "react";
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { Article } from "@/lib/types";
import { PairedCTA } from "@/components/PairedCTA";
import { Skeletons } from "@/components/JobCard";
import { IconChevR } from "@/lib/icons";

type A = Omit<Article, "body">;
const dateFmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const topicImg = (t: string) => /employer/i.test(t) ? "/media/img-team.webp" : /candidate/i.test(t) ? "/media/img-search.webp" : "/media/img-network.webp";

function AdviceGrid({ articles }: { articles: A[] }) {
  const [active, setActive] = useState("");
  const topics = [...new Set(articles.map((a) => a.topic))];
  const list = active ? articles.filter((a) => a.topic === active) : articles;
  const [featured, ...rest] = list;

  return (
    <div className="container" style={{ marginTop: 32 }}>
      <div className="chips-row" style={{ marginBottom: 20 }}>
        <button className={"chip" + (active === "" ? "" : " neutral")} onClick={() => setActive("")}>All topics</button>
        {topics.map((t) => (
          <button key={t} className={"chip" + (active === t ? "" : " neutral")} onClick={() => setActive(t)}>{t}</button>
        ))}
      </div>
      <div className="news-grid">
        {featured && (
          <a className="card news-feature" href={`/advice/article/${featured.slug}`}>
            <div className="nf-body">
              <span className="jr-sector">{featured.topic}</span>
              <h2>{featured.title}</h2>
              <p className="muted">{featured.excerpt}</p>
              <div className="news-meta"><span>{featured.author}</span><span>·</span><span>{dateFmt(featured.date)}</span><span>·</span><span>{featured.minutes} min read</span></div>
              <span className="arrow-link">Read the guide <IconChevR /></span>
            </div>
            <img className="photo-panel" src={topicImg(featured.topic)} alt="" loading="lazy" style={{ borderRadius: 20 }} />
          </a>
        )}
        {rest.map((a) => (
          <a key={a.slug} className="card news-card" href={`/advice/article/${a.slug}`}>
            <div className="nc-top"><span className="jr-sector">{a.topic}</span><span className="caption">{dateFmt(a.date)}</span></div>
            <h4>{a.title}</h4>
            <p className="small muted">{a.excerpt.slice(0, 120)}…</p>
            <div className="nc-foot"><span className="caption">{a.minutes} min read</span><span className="jr-arrow" aria-hidden="true"><IconChevR /></span></div>
          </a>
        ))}
      </div>
    </div>
  );
}

export function AdvicePage() {
  usePageMeta("Career Advice | Orbit Jobs", "Practical UK career advice: CVs, interviews, salary negotiation and more.");
  const { data, loading } = useData(() => api<{ results: A[] }>("/meta/articles"), []);

  return (
    <>
      <div className="hero"><div className="container" style={{ paddingTop: 48, paddingBottom: 40 }}>
        <span className="eyebrow">News &amp; advice</span>
        <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", maxWidth: "18ch" }}>Career advice that isn&rsquo;t filler</h1>
        <p className="hero-sub">Written for the UK market. Practical, specific, no &ldquo;follow your passion&rdquo;.</p>
      </div></div>
      {loading || !data ? (
        <div className="container" style={{ marginTop: 32 }}><Skeletons n={4} /></div>
      ) : (
        <AdviceGrid articles={data.results} />
      )}
      <PairedCTA market="UK" />
    </>
  );
}
