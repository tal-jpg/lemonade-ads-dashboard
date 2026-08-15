import { usePageMeta } from "@/lib/hooks";
import { NotFoundSearch } from "@/components/NotFoundSearch";

export function NotFoundPage() {
  usePageMeta("Page not found | Orbit Jobs");
  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 80, textAlign: "center" }}>
      <div className="ring-illo" style={{ margin: "0 auto 20px" }} />
      <h1>Lost in orbit</h1>
      <p className="muted">That page doesn&rsquo;t exist — but the jobs do.</p>
      <NotFoundSearch />
      <p className="small" style={{ marginTop: 20 }}>
        <a href="/">Home</a> · <a href="/jobs">All jobs</a> · <a href="/companies">Companies</a> · <a href="/advice">Advice</a> · <a href="/contact">Contact</a>
      </p>
    </div>
  );
}
