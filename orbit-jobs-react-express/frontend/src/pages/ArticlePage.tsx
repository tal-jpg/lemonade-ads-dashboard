/** Advice article — body, related reads, Article JSON-LD. */
import { useParams } from "react-router-dom";
import { api } from "@/lib/client";
import { JsonLd, useData, usePageMeta } from "@/lib/hooks";
import { articleLD } from "@/lib/seo";
import { dateLong } from "@/lib/format";
import type { Article } from "@/lib/types";
import { Skeletons } from "@/components/JobCard";
import { IconChevR } from "@/lib/icons";
import { NotFoundPage } from "./NotFoundPage";

export function ArticlePage() {
  const { slug = "" } = useParams();
  const { data, loading, notFound } = useData(
    () => api<{ article: Article; related: Omit<Article, "body">[] }>(`/meta/articles/${encodeURIComponent(slug)}`),
    [slug],
  );
  usePageMeta(
    data ? `${data.article.title} | Orbit Jobs` : undefined,
    data ? data.article.excerpt.slice(0, 155) : undefined,
  );

  if (loading) return <div className="container" style={{ paddingTop: 48 }}><Skeletons n={3} /></div>;
  if (notFound || !data) return <NotFoundPage />;

  const a = data.article;

  return (
    <>
      <JsonLd data={articleLD(a)} />
      <div className="hero job-hero">
        <div className="container">
          <a className="small" href="/advice">‹ All advice</a>
          <div className="article-head">
            <div style={{ marginTop: 18 }}><span className="job-sector" style={{ margin: "0 0 12px" }}>{a.topic}</span></div>
            <h1 className="job-title" style={{ maxWidth: "24ch" }}>{a.title}</h1>
            <div className="news-meta">
              <span className="nm-ava">{a.author[0]}</span>
              <span style={{ color: "var(--text-strong)", fontWeight: 600 }}>{a.author}</span>
              <span>·</span><span>{dateLong(a.date)}</span>
              <span>·</span><span>{a.minutes} min read</span>
            </div>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="article-body" style={{ marginTop: 40 }}>
          {a.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <div style={{ maxWidth: 720, marginTop: 44 }} className="paired">
          <div className="card"><h3>Put it into practice</h3><p className="small muted">Search live UK roles with honest salaries.</p><a className="btn btn-primary" href="/jobs">Search jobs</a></div>
          <div className="card"><h3>Hiring?</h3><p className="small muted">Post a role free while we launch.</p><a className="btn btn-accent" href="/employers/post-a-job">Post a job</a></div>
        </div>
        <div className="head-row" style={{ marginTop: 56 }}><h2 style={{ fontSize: 28 }}>Keep reading</h2><a className="arrow-link" href="/advice">All advice ›</a></div>
        <div className="news-grid" style={{ paddingBottom: 8 }}>
          {data.related.map((r) => (
            <a key={r.slug} className="card news-card" href={`/advice/article/${r.slug}`}>
              <div className="nc-top"><span className="jr-sector">{r.topic}</span></div>
              <h4>{r.title}</h4>
              <div className="nc-foot"><span className="caption">{r.minutes} min read</span><span className="jr-arrow" aria-hidden="true"><IconChevR /></span></div>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
