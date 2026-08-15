/**
 * App shell: chrome (header/footer), providers (session/toasts/modals),
 * client-side routing, and two SPA niceties —
 *   LinkInterceptor: the views keep their original plain <a href> markup;
 *     clicks on internal links become instant client-side navigations.
 *   ScrollToTop: mimic full-page navigation scroll behaviour.
 */
import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { OrbitProvider } from "@/components/providers";
import { Header } from "@/components/chrome/Header";
import { Footer } from "@/components/chrome/Footer";
import { RevealInit } from "@/components/RevealInit";

import { HomePage } from "@/pages/HomePage";
import { JobsSearchPage } from "@/pages/JobsSearchPage";
import { JobDetailPage } from "@/pages/JobDetailPage";
import { SpecialismPage } from "@/pages/SpecialismPage";
import { IndustryPage } from "@/pages/IndustryPage";
import { CompaniesPage } from "@/pages/CompaniesPage";
import { CompanyPage } from "@/pages/CompanyPage";
import { AdvicePage } from "@/pages/AdvicePage";
import { ArticlePage } from "@/pages/ArticlePage";
import { AboutPage } from "@/pages/AboutPage";
import { CandidatesPage } from "@/pages/CandidatesPage";
import { FaqsPage } from "@/pages/FaqsPage";
import { UploadCVPage } from "@/pages/UploadCVPage";
import { EmployersPage } from "@/pages/EmployersPage";
import { EmployerDashboardPage } from "@/pages/EmployerDashboardPage";
import { PostAJobPage } from "@/pages/PostAJobPage";
import { AccountPage } from "@/pages/AccountPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { AdminPage } from "@/pages/AdminPage";
import { AlertsPage } from "@/pages/AlertsPage";
import { SavedPage } from "@/pages/SavedPage";
import { ContactPage } from "@/pages/ContactPage";
import { LegalPage } from "@/pages/LegalPage";
import { SitemapPage } from "@/pages/SitemapPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

function LinkInterceptor() {
  const navigate = useNavigate();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//")) return; // absolute URLs, mailto:, tel:
      if (href.startsWith("#")) return; // in-page anchors
      if (href.startsWith("/api/")) return; // downloads / exports / interstitials come from the server
      if (/^\/sitemap.*\.xml$|^\/robots\.txt$/.test(href)) return; // served by Express
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);
  return null;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      try {
        const el = document.querySelector(hash);
        if (el) { el.scrollIntoView(); return; }
      } catch { /* invalid selector */ }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

/** Remounts the jobs search on every router navigation so links into
    /jobs?specialism=… re-read the URL (typing filters uses replaceState and
    never remounts). */
function JobsSearchRoute({ market }: { market: "UK" | "US" }) {
  const location = useLocation();
  return <JobsSearchPage key={location.key} market={market} />;
}

export default function App() {
  return (
    <OrbitProvider>
      <LinkInterceptor />
      <ScrollToTop />
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<HomePage market="UK" />} />
          <Route path="/us" element={<HomePage market="US" />} />

          <Route path="/jobs" element={<JobsSearchRoute market="UK" />} />
          <Route path="/us/jobs" element={<JobsSearchRoute market="US" />} />
          <Route path="/jobs/saved" element={<SavedPage />} />
          <Route path="/jobs/:slug" element={<JobDetailPage market="UK" />} />
          <Route path="/us/jobs/:slug" element={<JobDetailPage market="US" />} />

          <Route path="/specialisms/:slug" element={<SpecialismPage market="UK" />} />
          <Route path="/us/specialisms/:slug" element={<SpecialismPage market="US" />} />
          <Route path="/industries/:slug" element={<IndustryPage market="UK" />} />
          <Route path="/us/industries/:slug" element={<IndustryPage market="US" />} />
          <Route path="/companies" element={<CompaniesPage market="UK" />} />
          <Route path="/us/companies" element={<CompaniesPage market="US" />} />
          <Route path="/companies/:slug" element={<CompanyPage market="UK" />} />
          <Route path="/us/companies/:slug" element={<CompanyPage market="US" />} />

          <Route path="/advice" element={<AdvicePage />} />
          <Route path="/advice/article/:slug" element={<ArticlePage />} />

          <Route path="/candidates" element={<CandidatesPage />} />
          <Route path="/candidates/faqs" element={<FaqsPage />} />
          <Route path="/candidates/upload-cv" element={<UploadCVPage />} />

          <Route path="/employers" element={<EmployersPage />} />
          <Route path="/employers/dashboard" element={<EmployerDashboardPage />} />
          <Route path="/employers/post-a-job" element={<PostAJobPage />} />

          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/login" element={<LoginPage />} />
          <Route path="/account/register" element={<RegisterPage />} />

          <Route path="/admin" element={<AdminPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/legal/:page" element={<LegalPage />} />
          <Route path="/sitemap-pages" element={<SitemapPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <RevealInit />
    </OrbitProvider>
  );
}
