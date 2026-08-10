/* Orbit Jobs — Website Build Specification (DOCX generator) */
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, TableOfContents,
  Footer, Header, PageNumber, PageBreak, TabStopType, TabStopPosition, VerticalAlign,
  convertInchesToTwip,
} = require("docx");
const fs = require("fs");

/* ---------- palette ---------- */
const BRAND = "4F46B8";
const BRAND_DARK = "3E369A";
const INK = "14142B";
const BODY = "3F4054";
const MUTED = "6B6C80";
const TINT = "EDEBFB";
const SUBTLE = "F7F8FC";
const ACCENT = "F2B705";
const INVERSE = "171633";
const BORDER = "E3E6EF";

const FONT = "Calibri";
const CONTENT_W = 9026; // A4 minus 1in margins, in DXA

/* ---------- numbering ---------- */
let numInstance = 0;
const numbering = {
  config: [
    {
      reference: "bullets",
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 200 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 200 } } } },
      ],
    },
    {
      reference: "steps",
      levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 260 } } } },
      ],
    },
  ],
};

/* ---------- helpers ---------- */
const P = (text, opts = {}) =>
  new Paragraph({
    spacing: { after: opts.after ?? 140, line: 276 },
    alignment: opts.align,
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, font: FONT, size: opts.size ?? 21, color: opts.color ?? BODY, bold: opts.bold, italics: opts.italics })],
    ...(opts.extra || {}),
  });

const runs = (parts) =>
  parts.map(([t, o = {}]) => new TextRun({ text: t, font: FONT, size: o.size ?? 21, color: o.color ?? BODY, bold: o.bold, italics: o.italics }));

const H1 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 340, after: 180 },
    children: [new TextRun({ text, font: FONT, size: 34, bold: true, color: INK })],
    border: { bottom: { color: BRAND, style: BorderStyle.SINGLE, size: 12, space: 6 } },
  });

const H2 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 130 },
    children: [new TextRun({ text, font: FONT, size: 26, bold: true, color: BRAND_DARK })],
  });

const H3 = (text) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 110 },
    children: [new TextRun({ text, font: FONT, size: 22, bold: true, color: INK })],
  });

const B = (text, opts = {}) =>
  new Paragraph({
    numbering: { reference: "bullets", level: opts.level ?? 0 },
    spacing: { after: 80, line: 264 },
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, font: FONT, size: 21, color: BODY })],
  });

/* bold lead-in bullet:  "Label — rest" */
const BL = (label, rest, level = 0) =>
  new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { after: 80, line: 264 },
    children: [
      new TextRun({ text: label, font: FONT, size: 21, color: INK, bold: true }),
      new TextRun({ text: rest ? " — " + rest : "", font: FONT, size: 21, color: BODY }),
    ],
  });

const STEP = (text, instance) =>
  new Paragraph({
    numbering: { reference: "steps", level: 0, instance },
    spacing: { after: 80, line: 264 },
    children: [new TextRun({ text, font: FONT, size: 21, color: BODY })],
  });

const cell = (text, { w, bold, fill, color, size } = {}) =>
  new TableCell({
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { type: ShadingType.CLEAR, fill, color: "auto" } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: (Array.isArray(text) ? text : [text]).map(
      (t) =>
        new Paragraph({
          spacing: { after: 20, line: 252 },
          children: [new TextRun({ text: t, font: FONT, size: size ?? 19, bold, color: color ?? BODY })],
        })
    ),
  });

const table = (widths, rows, { headerFill = INVERSE, headerColor = "FFFFFF" } = {}) => {
  const [head, ...body] = rows;
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: head.map((h, i) => cell(h, { w: widths[i], bold: true, fill: headerFill, color: headerColor })),
      }),
      ...body.map(
        (r, ri) =>
          new TableRow({
            children: r.map((c, i) => cell(c, { w: widths[i], fill: ri % 2 === 1 ? SUBTLE : undefined })),
          })
      ),
    ],
  });
};

const spacer = (h = 120) => new Paragraph({ spacing: { after: h }, children: [] });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

/* ================================================================== */
/* COVER                                                               */
/* ================================================================== */
const cover = [
  spacer(1400),
  new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { after: 60 },
    children: [new TextRun({ text: "ORBIT JOBS", font: FONT, size: 96, bold: true, color: BRAND })],
  }),
  new Paragraph({
    spacing: { after: 300 },
    border: { bottom: { color: ACCENT, style: BorderStyle.SINGLE, size: 24, space: 10 } },
    children: [new TextRun({ text: "Website Build Specification", font: FONT, size: 44, bold: true, color: INK })],
  }),
  spacer(200),
  P("A complete, buildable specification for the Orbit Jobs recruitment platform: product requirements, information architecture, page-by-page specifications, user flows, UI/UX design system, functional and non-functional requirements, and the phased build plan.", { size: 23, color: BODY }),
  spacer(120),
  P([
    new TextRun({ text: "Phase 1 — United Kingdom. ", font: FONT, size: 23, bold: true, color: INK }),
    new TextRun({ text: "The launch product serves UK jobs only.", font: FONT, size: 23, color: BODY }),
  ]),
  P([
    new TextRun({ text: "Phase 2 — United States. ", font: FONT, size: 23, bold: true, color: INK }),
    new TextRun({ text: "A separate US Jobs tab replicates the UK structure and functionality. Section 11 specifies it; Phase 1 must be built US-ready.", font: FONT, size: 23, color: BODY }),
  ]),
  spacer(700),
  table([2200, 6826], [
    ["Field", "Value"],
    ["Document", "Orbit Jobs — Website Build Specification"],
    ["Version", "1.0 (draft for review)"],
    ["Date", "11 August 2026"],
    ["Prepared for", "Tal — Orbit Jobs founding team"],
    ["Audience", "Developers, designers and AI coding agents building the platform"],
    ["Basis", "Adapted from the light-theme recruitment blueprint (RecruitmentWebsiteBuildSpec) and the Orbit Jobs product decisions agreed in research"],
  ]),
  pageBreak(),
];

/* ================================================================== */
/* HOW TO USE + TOC                                                    */
/* ================================================================== */
const howTo = [
  H1("0. How To Use This Document"),
  P("This document is the single source of truth for building the first version of Orbit Jobs. It merges two inputs: the reference blueprint derived from an in-depth review of a leading recruitment website (re-imagined as a light-themed platform), and the Orbit Jobs product decisions — a self-serve job platform, launching with UK jobs only, expanding to a US Jobs tab in Phase 2."),
  B("Sections 1–3 define the product, its users and its scope. Read them first; every later requirement traces back to them."),
  B("Sections 4–10 are prescriptive build instructions: information architecture, page specifications, user flows, functionality, design system, forms, data model and quality requirements. They are written as direct instructions to a developer or an AI coding agent."),
  B("Section 11 specifies the Phase 2 US Jobs expansion and, critically, the things Phase 1 MUST do so that the US tab is a configuration exercise rather than a rebuild."),
  B("Sections 12–13 recommend the technical stack and define the build order, milestones and launch acceptance criteria."),
  P([
    new TextRun({ text: "Normative language. ", font: FONT, size: 21, bold: true, color: INK }),
    new TextRun({ text: "MUST means required for launch. SHOULD means strongly recommended and expected unless there is a documented reason. MAY means optional. Anything marked Phase 2 or Phase 3 is out of the launch build.", font: FONT, size: 21, color: BODY }),
  ]),
  P([
    new TextRun({ text: "Originality. ", font: FONT, size: 21, bold: true, color: INK }),
    new TextRun({ text: "All copy, imagery, illustration and branding must be original to Orbit Jobs. The reference blueprint contributes structure, flows and patterns only. Aggregated job listings must always carry visible source attribution (Section 7.6).", font: FONT, size: 21, color: BODY }),
  ]),
  spacer(),
  H2("Table of contents"),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  pageBreak(),
];

/* ================================================================== */
/* 1. PRODUCT OVERVIEW                                                 */
/* ================================================================== */
const s1 = [
  H1("1. Product Overview"),
  H2("1.1 What Orbit Jobs is"),
  P("Orbit Jobs is a recruitment platform that brings UK jobs from many sources into one place. It combines two inventories in a single search experience:"),
  BL("Aggregated jobs", "technical and non-technical roles collected from partner job boards and feeds, normalised into one consistent format, always shown with visible source attribution. These seed the platform with depth from day one."),
  BL("Direct jobs", "roles posted by employers through Orbit Jobs' self-serve posting flow. These are the premium inventory: candidates apply natively on Orbit Jobs and employers manage applicants in a dashboard."),
  P("Candidates search, filter, save, set alerts and apply. Employers register, post jobs in minutes and manage applications. An internal admin function moderates listings, manages sources and keeps quality high."),
  H2("1.2 Positioning and differentiation"),
  P("The market is dominated by large incumbents, so Orbit Jobs competes on experience and honesty, not on inventory size alone:"),
  BL("Everything in one place", "one search across many boards plus direct employer roles — the core promise of the product."),
  BL("Speed-led UX", "a search-first, minimal, fast interface in the school of the best utility job sites: instant search, skeleton loading, one-click actions, mobile-first."),
  BL("Salary transparency", "salary is shown wherever it exists, a 'salary disclosed only' filter is one tap away, and employers are actively nudged to publish ranges. This is the marketing wedge."),
  BL("Honest attribution", "aggregated roles say where they come from and link out to apply at the source; direct roles offer a native 60-second apply. The platform never fakes ownership of third-party listings."),
  H2("1.3 Audiences"),
  BL("Job seekers", "UK-based candidates across technical and non-technical fields, on mobile more often than desktop."),
  BL("Employers", "UK companies — particularly small and mid-sized businesses without a strong careers site — who want qualified applicants without enterprise ATS complexity."),
  BL("Internal team", "operations and admin users who moderate content, manage aggregation sources and support users."),
  H2("1.4 Goals and success metrics"),
  table([3300, 2700, 3026], [
    ["Goal", "Metric", "Launch target"],
    ["Candidates find relevant roles fast", "Search to first job-detail view", "Under 30 seconds median"],
    ["Applying is effortless", "Apply completion time (direct jobs, mobile, no account)", "Under 60 seconds"],
    ["Candidates come back", "Job-alert signups; alert click-through rate", "20% of searchers create an alert; 8%+ CTR"],
    ["Employers self-serve successfully", "Time to publish a job; jobs per employer", "Under 5 minutes; 2+ jobs in first month"],
    ["Inventory is trustworthy", "Duplicate rate in results; dead-link rate", "Under 3%; under 2% weekly"],
    ["The platform performs", "Core Web Vitals on mobile", "LCP < 2.5s, INP < 200ms, CLS < 0.1"],
  ]),
  spacer(),
  H2("1.5 Business model (context only)"),
  P("Launch is free for both sides to build liquidity. Monetisation is Phase 3 and out of build scope, but the architecture must not block it: featured listings, employer subscriptions, and cost-per-click on outbound aggregated listings are the planned routes. Nothing in Phase 1 may hard-code the assumption that all listings are free forever (Section 9.3 reserves the fields)."),
];

/* ================================================================== */
/* 2. SCOPE & PHASING                                                  */
/* ================================================================== */
const s2 = [
  H1("2. Scope and Phasing"),
  H2("2.1 Phase map"),
  table([1500, 4300, 3226], [
    ["Phase", "Contents", "Exit criteria"],
    ["Phase 1 (this spec)", "UK jobs only. Aggregation pipeline + employer self-serve posting. Candidate search, save, alerts, native apply, accounts and dashboard. Employer dashboard and moderation. Specialism/industry SEO pages, career advice hub (lite), legal and consent layer.", "All Section 13.3 acceptance criteria pass; UK market live to the public."],
    ["Phase 2", "US Jobs tab: full mirror of the UK structure under /us/ with US locations, USD salaries, US legal additions. Section 11.", "All UK criteria pass on /us/; no cross-market bleed."],
    ["Phase 3+", "Monetisation (featured listings, employer plans), company reviews, candidate profiles visible to employers, messaging, mobile apps, salary tools.", "Not specified here."],
  ]),
  spacer(),
  H2("2.2 Explicitly out of scope for Phase 1"),
  B("US jobs and any non-UK market (the US tab must not be visible in Phase 1 navigation)."),
  B("Payments and billing of any kind."),
  B("Company reviews and ratings; candidate-to-employer messaging; video interviews."),
  B("A native mobile app — the responsive web app is the mobile experience."),
  B("Multi-language content; Phase 1 is English (en-GB)."),
  H2("2.3 The one rule that spans all phases"),
  P([
    new TextRun({ text: "Country is configuration, not code. ", font: FONT, size: 21, bold: true, color: INK }),
    new TextRun({ text: "Every job, employer, alert, page template, search index partition, currency format and sitemap is scoped by a country value from day one. Phase 2 then means: enable the US partition, load US sources, reveal the US Jobs tab. Section 11.4 lists the Phase 1 obligations that make this true.", font: FONT, size: 21, color: BODY }),
  ]),
];

/* ================================================================== */
/* 3. USERS & STORIES                                                  */
/* ================================================================== */
const s3 = [
  H1("3. Users, Personas and User Stories"),
  H2("3.1 Personas"),
  BL("Amelia, 27 — marketing executive, Manchester", "browses on her phone in the evening. Wants relevant roles without opening six sites, hates listings with no salary, will not create an account until the site has proven useful. Success: she applies to two roles in one sitting and sets an alert."),
  BL("Dev, 34 — senior software engineer, London", "salary-driven and filter-heavy. Searches by stack and day-rate/salary, compares across boards, values remote/hybrid clarity. Success: a saved search emails him only genuinely new, deduplicated roles."),
  BL("Priya, 41 — HR manager, 40-person logistics firm, Leeds", "no ATS, hires four roles a year. Wants to post a job in minutes, receive decent CVs in one place, and shortlist without training. Success: job live in under 5 minutes, applicants managed in the dashboard."),
  BL("Sam — Orbit Jobs operations", "reviews new employers and first postings, watches source health, removes duplicates and expired roles, answers support email. Success: the morning moderation queue is cleared in 20 minutes."),
  H2("3.2 Core user stories (MoSCoW)"),
  table([1100, 6200, 1726], [
    ["ID", "Story", "Priority"],
    ["C1", "As a candidate, I can search jobs by keyword and location and see results in under a second.", "Must"],
    ["C2", "As a candidate, I can filter by job type, specialism, industry, salary range, seniority, work model, date posted and source type, and my filters live in the URL.", "Must"],
    ["C3", "As a candidate, I can open a job and understand the role, pay, location and how to apply, without ambiguity about where the job comes from.", "Must"],
    ["C4", "As a candidate, I can apply to a direct job in under 60 seconds on mobile without an account.", "Must"],
    ["C5", "As a candidate, I can save jobs and searches; signing in mid-action never loses my place.", "Must"],
    ["C6", "As a candidate, I can create an email alert from my current filters and manage or unsubscribe from it in one click.", "Must"],
    ["C7", "As a candidate, I can register, manage my CV and profile, and track my applications and their statuses.", "Must"],
    ["C8", "As a candidate, I can drop my CV into a talent pool from any page (Quick CV Drop-off).", "Should"],
    ["E1", "As an employer, I can register my company with a work email and be verified before my first job goes live.", "Must"],
    ["E2", "As an employer, I can post a job through a 3-step wizard with autosave, preview and a salary-transparency nudge.", "Must"],
    ["E3", "As an employer, I can manage my listings (edit, close, repost, see views and applies).", "Must"],
    ["E4", "As an employer, I can review applicants, read/download CVs, move them through statuses and export to CSV.", "Must"],
    ["E5", "As an employer, I can maintain a public company profile that lists all my live roles.", "Should"],
    ["A1", "As an admin, I can approve or reject new employers and first postings with templated reason emails.", "Must"],
    ["A2", "As an admin, I can manage aggregation sources, see their health, and hide/merge/expire any listing.", "Must"],
    ["A3", "As an admin, I can view reported listings and act on them within one working day.", "Must"],
  ]),
];

/* ================================================================== */
/* 4. IA & SITEMAP                                                     */
/* ================================================================== */
const s4 = [
  H1("4. Information Architecture and Global Chrome"),
  H2("4.1 Navigation model"),
  P("The header carries three layers, consistent on every page:"),
  BL("Market tabs (top strip)", "'UK Jobs' is the single visible tab in Phase 1. In Phase 2 a 'US Jobs' tab appears beside it; the active tab sets the market context for the whole session (search scope, currency, featured content). Tabs are navigation, never a forced redirect."),
  BL("Primary navigation", "Jobs · Companies · Specialisms (mega panel) · Career Advice · For Employers · About. The Specialisms mega panel lists the twelve job families in columns and surfaces the two latest advice articles on the right — the panel doubles as an editorial slot."),
  BL("Utility cluster (right)", "a Saved Jobs heart with a count badge, a cloud-upload icon opening the global Quick CV Drop-off modal, Sign in, and the employer call to action 'Post a Job' as an accent-coloured pill. On mobile these collapse into the drawer."),
  P("Dual-track rule: every marketing page presents one candidate action (brand button) and one employer action (accent button), from the hero to the closing paired-CTA block. This is the highest-value structural pattern from the reference research and is mandatory."),
  H2("4.2 URL tree (Phase 1, UK)"),
  P("Clean, human-readable, lowercase, hyphenated, with a consistent trailing-slash policy. UK is the default market and keeps these URLs permanently; the US mirror lives under /us/ in Phase 2 — the UK estate is never migrated."),
  BL("/", "home."),
  BL("/jobs/", "job search; /jobs/{slug}-{id}/ job detail; /jobs/saved/ shortlist; /alerts/ manage alerts."),
  BL("/companies/", "employer directory; /companies/{slug}/ company profile with live roles."),
  BL("/specialisms/{slug}/", "twelve job-family landing pages: technology, finance-and-accounting, sales, marketing, engineering, healthcare, human-resources, operations-and-supply-chain, legal, customer-experience, education, construction."),
  BL("/industries/{slug}/", "eight industry pages: fintech, healthcare-and-life-sciences, manufacturing, retail-and-ecommerce, professional-services, public-sector, energy, media."),
  BL("/candidates/", "candidate hub; /candidates/upload-cv/; /candidates/faqs/."),
  BL("/employers/", "employer hub; /employers/post-a-job/ (wizard, authed); /employers/pricing/ (free-at-launch explainer); /employers/dashboard/ and children (app area)."),
  BL("/advice/", "career-advice hub; /advice/search/; /advice/article/{slug}/."),
  BL("/about/  /contact/", "company pages."),
  BL("/account/", "login, register, register/candidate, register/employer, forgot-password, reset-password, dashboard, applications, profile, preferences."),
  BL("/legal/", "privacy, cookies, terms, acceptable-use, accessibility."),
  BL("/sitemap/", "human-readable sitemap; XML sitemaps at /sitemap.xml split by type (pages, jobs, specialisms, companies, advice)."),
  BL("404 / 410 / 500", "custom pages; expired jobs return a helpful expired state, never a bare 404 (Section 5.3)."),
  H2("4.3 Global chrome"),
  H3("Announcement bar"),
  B("Full-width strip above the header. CMS-editable: text, link label, link URL, tone (info/success/warning), on/off. Dismissible, remembered per device for 14 days."),
  H3("Header"),
  B("Transparent over the home hero, solid with a soft shadow after 80px of scroll (200ms ease). Sticky on all pages."),
  B("Mobile: hamburger opens a full-height right drawer, drill-down (not accordion) for children, with a job-search field pinned to the top and Sign in + Post a Job pinned to the bottom."),
  H3("Footer"),
  B("Dark (surface-inverse) panel, four zones: contact + social; quick links; the twelve specialism links in two columns (deliberate internal linking); job-alert/newsletter signup field."),
  B("Bottom bar: copyright, legal links (privacy, cookies, terms, acceptable use, accessibility statement), and the market switcher repeated as text links (UK Jobs · US Jobs from Phase 2)."),
  H3("Consent layer"),
  B("Cookie banner on first visit with Customise, Reject All and Accept All given equal visual weight. Full preference centre by category with a per-cookie table; floating badge reopens preferences. No analytics or marketing tags fire before consent (UK GDPR / PECR)."),
];

/* ================================================================== */
/* 5. PAGES                                                            */
/* ================================================================== */
const s5 = [
  H1("5. Page-by-Page Specification"),
  P("Each page lists its purpose and its sections in scroll order. Order matters: it encodes the persuasion sequence. All pages end with the paired candidate/employer CTA block and the footer unless stated."),

  H2("5.1 Home"),
  P("Purpose: route candidates into search within five seconds, and employers into posting, while establishing trust."),
  STEP("Hero on a soft brand-tint wash: H1 with a rotating job-family word ('Find your next role in Technology / Finance / Marketing…', static under reduced motion); sub-line stating the promise ('Every UK job, one search'); an inline job search bar (keyword, location with type-ahead, Search) directly in the hero; beneath it the dual CTAs — 'Search jobs' (brand) and 'Post a job' (accent).", ++numInstance),
  STEP("Live-inventory proof strip: jobs live now, sources aggregated, roles added today — animated count-up, real numbers from the index, never hard-coded.", numInstance),
  STEP("Latest jobs strip: six most recent roles as JobCards with a View all link. The single highest-value block on the page.", numInstance),
  STEP("Specialism grid: twelve illustrated tiles on surface-subtle, one per job family, linking to specialism pages.", numInstance),
  STEP("How it works (candidates): three numbered steps — search everything in one place, filter to exactly what fits, apply in one click or at the source.", numInstance),
  STEP("Employer band on surface-inverse: value proposition ('Reach candidates across every field'), three proof points, 'Post a job — free at launch' accent CTA.", numInstance),
  STEP("Testimonials carousel: mixed candidate and employer quotes with name, role, company.", numInstance),
  STEP("Featured career advice: three article cards plus View all.", numInstance),
  STEP("Paired conversion block: 'Upload your CV' card and 'Hiring? Post a job' card. Footer.", numInstance),

  H2("5.2 Job search (/jobs/)"),
  P("Purpose: the core product surface. Fast, filterable, shareable, mobile-first."),
  H3("Layout"),
  B("Hero search band: keyword field, location field with type-ahead and radius select (5–50 miles), Search button. Below: two-column layout — filter rail left (280px), results right."),
  B("Results header: 'Showing X of Y jobs' + sort select (most recent, relevance, salary high–low, salary low–high)."),
  B("Applied filters render as removable chips above the results; 'Clear all' appears from two chips."),
  H3("Filters (all MUST)"),
  B("Job type (permanent, contract, temporary, part-time, apprenticeship); Specialism (12); Industry (8); Salary range slider (annual, GBP) with a 'Only show jobs with disclosed salary' toggle; Seniority (entry, junior, mid, senior, lead, executive); Work model (on-site, hybrid, remote); Date posted (24h, 3d, 7d, 14d, 30d); Source (all, Orbit direct, partner listings)."),
  H3("Behaviour"),
  B("Filtering and paging happen client-side against the search API without a full reload; the URL always encodes the complete state and survives refresh, back button and sharing."),
  B("Skeleton cards while loading — never a spinner alone, and no layout shift."),
  B("Pagination as a Load more button plus numbered fallback for crawlers; 20 results per page."),
  B("Save heart on every card: unauthenticated click opens the sign-in modal and completes the save after auth without losing scroll position."),
  B("'Create a job alert for this search' CTA beneath the filters and at the end of results, capturing email + the current filter set."),
  B("Empty state: friendly message, the three nearest matches (relaxed radius/filters), and prompts to set an alert or upload a CV. Never a bare 'no results'."),
  B("Mobile: filter rail collapses into a sticky 'Filters (n)' button opening a full-screen sheet with Apply and Clear."),
  H3("JobCard anatomy"),
  B("Job title (link, whole card clickable); company name + logo (or 'Confidential'); location + work-model chip; salary line (range, period) or 'Salary not disclosed' in muted text; job-type chip; posted date ('2 days ago'); source badge — 'Orbit direct' (brand chip) or 'via {SourceName}' (neutral chip); save heart; two-line summary."),

  H2("5.3 Job detail (/jobs/{slug}-{id}/)"),
  STEP("Back to results link preserving the previous search state.", ++numInstance),
  STEP("H1 job title with Apply button immediately beside it; meta row: company (linked to profile), location, salary, job type, work model, posted date, reference.", numInstance),
  STEP("Company card (right rail): logo, name, one-liner, live-roles count, link to profile. For aggregated jobs with no company profile: source card naming the partner board instead.", numInstance),
  STEP("Full description from rich text (headings, paragraphs, bullets). Aggregated descriptions are sanitised and reformatted to house style.", numInstance),
  STEP("Share row: LinkedIn, X, WhatsApp, email, Copy link.", numInstance),
  STEP("Apply zone — two variants. Direct job: inline quick-apply form (first name, last name, email, phone, CV upload or profile URL, optional message, required consent checkbox, Apply). Signed-in candidates see a pre-filled one-click apply with their stored CV. Aggregated job: a prominent 'Apply on {SourceName}' external button with microcopy ('You'll complete this application on {SourceName}. We'll keep the job saved here.'), opening in a new tab with outbound tracking.", numInstance),
  STEP("Sticky apply bar appears when the top Apply scrolls out of view: title, salary, Apply/Save.", numInstance),
  STEP("Similar jobs carousel (same specialism, nearby, similar salary).", numInstance),
  B("Structured data: schema.org JobPosting with title, description, datePosted, validThrough, employmentType, hiringOrganization, jobLocation, baseSalary, applicantLocationRequirements, directApply true/false. MUST validate for every live role."),
  B("Expired roles return HTTP 410 with an expired-state page: explanation, three similar live roles, alert CTA — never a bare 404."),
  B("After a direct apply: inline success panel with what-happens-next and expected response time, confirmation email, and a one-field prompt to create an account to track the application."),

  H2("5.4 Companies (/companies/, /companies/{slug}/)"),
  B("Index: searchable grid of employer cards (logo, name, industry, live-roles count) with industry filter. Only verified employers with at least one live or recent role appear."),
  B("Profile: header with logo, name, industry chips, website link; About section (CMS-editable by the employer); live roles list (JobCards); 'Follow this company' subscribes to a per-company alert."),

  H2("5.5 Candidate hub (/candidates/)"),
  B("Hero with a question headline and a Search jobs button; value blocks (one place, honest salaries, alerts that work); How it works in four steps (search, save or apply, track, get alerted); featured jobs carousel; specialism grid; testimonials; advice teaser; paired CTA."),

  H2("5.6 Upload CV and the Quick CV Drop-off modal"),
  B("Page (/candidates/upload-cv/): first name, last name, email, specialism select, current job title (optional), a conditional CV control — file upload (PDF/DOC/DOCX, 5 MB, progress bar) or a LinkedIn/profile URL — marketing opt-in (unticked) and required terms consent. Success screen states what happens next. An 'Add more detail' toggle reveals desired salary, notice period, preferred locations, work model."),
  B("Quick CV Drop-off: the same form shortened (name, email, specialism, CV or URL, consents), opened as a modal from the header cloud icon on every page. Focus-trapped, Escape and backdrop close, focus returns to trigger, entered data preserved on accidental close."),
  B("Both feed the candidate talent pool with explicit consent flags and a documented retention period (Section 10.4)."),

  H2("5.7 Employer hub (/employers/)"),
  B("Hero: 'Hire across every field — post a job free' with the accent CTA and a secondary 'See how it works'. Sub-line sets expectations (live in minutes after a one-time verification)."),
  B("How it works in three steps: create your company account → post your job in under 5 minutes → review applicants in one dashboard."),
  B("Outcomes strip (three proof metrics once real data exists; launch copy uses the value promise, never fabricated numbers)."),
  B("Salary-transparency explainer: why disclosed ranges get more and better applicants — sets up the wizard nudge."),
  B("Pricing block: free at launch, what will remain free, what may become paid (honest, short). FAQ accordion. Employer testimonials. Paired CTA (candidate card here is secondary)."),

  H2("5.8 Post-a-Job wizard (/employers/post-a-job/)"),
  P("Authenticated employers only; unauthenticated visitors see the value pitch and the register/sign-in fork. Three steps, autosaved as a draft on every change:"),
  STEP("Basics — job title (with live suggestions of standard titles), specialism, industry, location (UK place type-ahead) or Remote (UK), work model, job type, seniority.", ++numInstance),
  STEP("Details — description in a rich editor pre-seeded with a house template (About the role, What you'll do, What you'll need, Benefits); salary min/max + period (annual/day/hour) with a display toggle and the nudge: 'Jobs with a published salary range receive significantly more applications'; application method — collect applications on Orbit Jobs (default) or send applicants to an external URL; up to three optional screening questions (free text or yes/no).", numInstance),
  STEP("Review and publish — full preview exactly as candidates will see it (card + detail), validation summary, Publish (or Save draft). First-ever posting from a new employer enters the moderation queue (Section 6.5) with a clear 'usually approved within a few working hours' promise; subsequent postings go live immediately with post-hoc spot checks.", numInstance),
  B("Listings run 30 days by default with expiry reminders at 7 and 1 days; one-click repost. Edit, pause and close at any time."),

  H2("5.9 Employer dashboard (/employers/dashboard/)"),
  B("Overview: active jobs, total views, total applies, applies this week (sparkline)."),
  B("Jobs table: title, status pill (Draft / In review / Live / Paused / Expired / Closed), views, applies, posted and expiry dates, actions (edit, pause, close, repost, view public page)."),
  B("Applicants per job: list rows with name, applied date, CV preview/download (signed URL), screening answers, status pipeline (New → Shortlisted → Contacted → Rejected) via drag or select, one-line notes, CSV export. Status changes MAY trigger optional candidate notification emails (employer chooses; rejection template is kind and generic)."),
  B("Company profile editor: logo, about, website, industry. Account settings: users (single seat in Phase 1), email preferences."),

  H2("5.10 Candidate dashboard (/account/dashboard/)"),
  B("Overview: saved jobs, active alerts, recent applications with statuses."),
  B("Applications list: job, company, date, status (Submitted / Viewed / Shortlisted / Not progressing — as reported by employers), link to the job (or its expired state)."),
  B("Saved jobs with expiry warnings ('closes in 3 days'). Saved searches/alerts: name, filter summary, frequency (instant/daily/weekly), pause/delete."),
  B("Profile: contact details, CV manager (upload/replace/delete, one primary CV), desired salary, preferred locations, work model. Preferences: email settings, data & privacy (export my data, delete my account — self-service, Section 10.4)."),

  H2("5.11 Authentication"),
  B("Sign-in: split-screen — left panel sells the account with three icon rows (Saved jobs & shortlists, Application tracking, Job alerts); right panel: email, password (show/hide), 'Keep me signed in', Sign in, magic-link option ('Email me a sign-in link'), Create account, Forgot password."),
  B("Register fork: two cards — 'I'm looking for a job' and 'I'm hiring'. Candidate: name, email, password, optional CV upload. Employer: company name, company website, your name, work email (free-mail domains flagged for manual verification), password. Email verification required for both; employers also pass the one-time first-post review."),
  B("Forgot/reset password flows; resets invalidate existing sessions. Password strength meter; rate limiting on all auth endpoints; never auto-fill credentials into forms."),

  H2("5.12 Specialism pages (/specialisms/{slug}/) — the SEO engine"),
  P("One template, twelve pages, every zone content-managed. Each page MUST have genuinely distinct copy — near-duplicate pages will be treated as thin by search engines."),
  B("Zones in order: tinted hero (family-specific accent tint + illustration) with an H1 like 'Technology jobs across the UK' and an inline search scoped to the family; intro paragraph; live jobs feed filtered to the family (12 cards + View all deep-linking into pre-filtered search); popular job titles with two-sentence definitions (long-tail SEO); salary snapshot table computed from live index data (median advertised salary by seniority — only shown above a minimum sample size); top companies hiring in the family; FAQs with FAQPage structured data; related advice; paired CTA."),

  H2("5.13 Industry pages (/industries/{slug}/)"),
  B("Same engine, different lens: market context intro, in-demand roles (linking into specialism pages), live jobs filtered by industry, companies in the industry, cross-links to the other industries, related advice, paired CTA."),

  H2("5.14 Career advice (/advice/)"),
  B("Hub: sticky topic bar (per-specialism topics + candidate/employer resources) with a keyword search; magazine landing — one featured article, a Must-read column, a recent grid; every card shows category chip, title, reading time, author, date."),
  B("Search results: faceted by type and topic with counts, paginated with a result counter."),
  B("Article template: back link, category chip, H1, date + reading time, author byline, share row, body with pull quotes, author panel, related posts. Article structured data. Launch content: minimum 12 articles (Section 13, Appendix B)."),

  H2("5.15 About and Contact"),
  B("About: founding story ('why one place'), mission, values, the honest-numbers strip (jobs indexed, sources, employers), team (optional at launch), careers teaser."),
  B("Contact: reason select (candidate support, employer support, data/privacy request, press, partnerships) routing to the right inbox; name, email, message, consents; support email published; response-time promise. No phone requirement."),

  H2("5.16 Utility, legal and error pages"),
  B("FAQs (/candidates/faqs/): accordion with FAQPage structured data and per-question deep links."),
  B("Legal set under /legal/: privacy notice, cookie policy, terms of use, acceptable use (employer posting rules: no discriminatory requirements, no fee-charging roles, no MLM), accessibility statement. Single column, table of contents, last-updated date, anchors."),
  B("Human sitemap page; custom 404 with search box + six popular links; 410 expired-job template; 500 with status-page link; maintenance page."),
];

/* ================================================================== */
/* 6. USER FLOWS                                                       */
/* ================================================================== */
const s6 = [
  H1("6. User Flows"),
  H2("6.1 Candidate: discover → apply"),
  STEP("Entry: organic search onto a job detail or specialism page (majority), direct, or social.", ++numInstance),
  STEP("Search from the hero or land pre-filtered from a specialism page. Refine with filters; state lives in the URL throughout.", numInstance),
  STEP("Scan JobCards; salary and source visible on every card. Open a job (new context preserved by the back link).", numInstance),
  STEP("Branch A — direct job: inline quick apply (≤ 60s, no account). Branch B — aggregated job: 'Apply on {Source}' link-out in a new tab; on return, the page shows 'Did you apply?' allowing the candidate to log it in their tracker (if signed in). Branch C — save for later: sign-in modal mid-action, save completes after auth, position preserved. Branch D — nothing right: create an alert from current filters or use Quick CV Drop-off.", numInstance),
  STEP("Confirmation screen and email; optional one-field account creation to track the application; alert prompt.", numInstance),
  H2("6.2 Candidate: alerts loop"),
  STEP("Create alert from search (email + filters) or from the dashboard. Double opt-in for non-registered emails.", ++numInstance),
  STEP("Delivery: instant, daily or weekly digest; only new-since-last-send, deduplicated roles; each email lists 5–10 jobs with salary and source, one-click unsubscribe and a manage link.", numInstance),
  STEP("Click-through lands on the job with the alert as tracked source; a dead job redirects to its expired page with similar roles.", numInstance),
  H2("6.3 Employer: register → hire"),
  STEP("Land on /employers/ → Post a job → register (company + work email) → verify email.", ++numInstance),
  STEP("Wizard (Section 5.8) → first post enters moderation → approval email → live. Subsequent posts publish immediately.", numInstance),
  STEP("Applications arrive in the dashboard (email notification per application or daily digest, employer's choice). Employer shortlists, contacts, rejects; statuses reflect into candidate trackers.", numInstance),
  STEP("Expiry reminders → repost or close. Closed jobs return the 410 expired page.", numInstance),
  H2("6.4 Aggregation pipeline (system flow)"),
  STEP("Ingest: per-source adapters pull official feeds/APIs on a schedule (hourly–daily per source). Each adapter has a field map config translating source fields to the Orbit job schema — one mapping file per source, no per-source code forks.", ++numInstance),
  STEP("Normalise: clean HTML, standardise salary (value, period, currency), geocode location to the UK place taxonomy, classify into specialism/industry (rules + classifier with confidence threshold; low-confidence roles go to an admin review queue).", numInstance),
  STEP("Deduplicate: fuzzy hash on employer + title + location (+ salary band); duplicates across sources merge into one listing with the earliest source credited and others listed as 'also on'. Direct Orbit postings always win over aggregated duplicates.", numInstance),
  STEP("Index: upsert into the country-partitioned search index; expiry sweep removes roles past validThrough or missing from two consecutive source runs; outbound links are health-checked.", numInstance),
  STEP("Compliance: only sources with permission (official feeds, APIs, partnerships) are ingested; every listing stores its source and outbound URL; attribution is always rendered. A kill switch per source exists in admin.", numInstance),
  H2("6.5 Admin: moderation and quality"),
  STEP("Morning queue: new employers, first postings, low-confidence classifications, reported listings. Approve/reject with templated reason emails; SLA one working day.", ++numInstance),
  STEP("Source health dashboard: last run, items in/out, error rate, dead-link rate; alerting when a source degrades.", numInstance),
  STEP("Any listing can be hidden, edited (category fix), merged or expired; all admin actions are audit-logged.", numInstance),
];

/* ================================================================== */
/* 7. FUNCTIONAL REQUIREMENTS                                          */
/* ================================================================== */
const s7 = [
  H1("7. Functional Requirements"),
  P("Numbered for traceability. Priorities: M = Must (launch), S = Should, P2/P3 = later phase."),
  H2("7.1 Search"),
  table([1200, 6100, 1726], [
    ["ID", "Requirement", "Priority"],
    ["FR-S1", "Keyword search across title, company, description and skills with typo tolerance and synonym support (e.g. 'dev' ↔ 'developer').", "M"],
    ["FR-S2", "Location search against the UK place taxonomy with radius filtering (5–50 miles) and a 'Remote (UK)' scope.", "M"],
    ["FR-S3", "All filters in Section 5.2 combinable; results return in under 300ms server-side at the 95th percentile.", "M"],
    ["FR-S4", "Full search state encoded in the URL; shareable, refresh-safe, back-button-safe.", "M"],
    ["FR-S5", "Sort by recency (default), relevance, salary high–low / low–high (undisclosed-salary roles always sort last in salary modes).", "M"],
    ["FR-S6", "Search index partitioned by country; Phase 1 queries are hard-scoped to UK.", "M"],
  ]),
  spacer(),
  H2("7.2 Jobs and applications"),
  table([1200, 6100, 1726], [
    ["ID", "Requirement", "Priority"],
    ["FR-J1", "Two listing classes — direct and aggregated — sharing one schema; class visibly distinguishable on cards and detail (source badge).", "M"],
    ["FR-J2", "Direct jobs: native apply capturing name, email, phone, CV (file or URL), optional message and screening answers; stored against the job; confirmation email to candidate; notification to employer.", "M"],
    ["FR-J3", "Signed-in one-click apply using stored profile + primary CV.", "M"],
    ["FR-J4", "Aggregated jobs: outbound apply with tracked redirect; no application data collected on Orbit for these roles.", "M"],
    ["FR-J5", "Job lifecycle: Draft → In review → Live → Paused/Expired/Closed → Archived; 410 expired page; 30-day default term with reminders and one-click repost.", "M"],
    ["FR-J6", "Duplicate suppression across sources with 'also on' attribution; direct postings outrank aggregated duplicates.", "M"],
    ["FR-J7", "Report-a-listing control on every job detail feeding the admin queue.", "M"],
  ]),
  spacer(),
  H2("7.3 Candidate accounts, saves and alerts"),
  table([1200, 6100, 1726], [
    ["ID", "Requirement", "Priority"],
    ["FR-C1", "Save jobs and searches; unauthenticated saves complete after in-context sign-in without losing state.", "M"],
    ["FR-C2", "Alerts from any filter set: instant/daily/weekly; only new deduplicated roles; one-click unsubscribe; double opt-in for unregistered emails.", "M"],
    ["FR-C3", "Application tracker fed by native applies, employer status changes, and self-logged external applies.", "M"],
    ["FR-C4", "CV manager: upload/replace/delete, one primary CV, 5 MB, PDF/DOC/DOCX, server-side virus scan, private storage with signed URLs.", "M"],
    ["FR-C5", "Self-service data export and account deletion honouring retention rules.", "M"],
  ]),
  spacer(),
  H2("7.4 Employer tools"),
  table([1200, 6100, 1726], [
    ["ID", "Requirement", "Priority"],
    ["FR-E1", "Company registration with email verification; free-mail domains and mismatched websites flagged for manual review.", "M"],
    ["FR-E2", "3-step posting wizard with autosave drafts, preview, salary nudge, screening questions, external-URL apply option.", "M"],
    ["FR-E3", "Listing management: edit, pause, close, repost; views and applies per listing.", "M"],
    ["FR-E4", "Applicant pipeline with statuses, notes, CV access, CSV export; optional templated candidate notifications.", "M"],
    ["FR-E5", "Public company profile with live roles; follow-company alerts.", "S"],
  ]),
  spacer(),
  H2("7.5 Admin"),
  table([1200, 6100, 1726], [
    ["ID", "Requirement", "Priority"],
    ["FR-A1", "Moderation queues (employers, first posts, reports, low-confidence classifications) with templated decisions and full audit log.", "M"],
    ["FR-A2", "Source manager: add/pause sources, edit field maps, view run history and health metrics, per-source kill switch.", "M"],
    ["FR-A3", "Listing operations: hide, edit categories, merge duplicates, force-expire.", "M"],
    ["FR-A4", "User support operations: look up users, resend verifications, GDPR request handling.", "M"],
  ]),
  spacer(),
  H2("7.6 Aggregation and attribution rules"),
  B("Only ingest sources Orbit Jobs has the right to use: official XML/JSON feeds, public APIs, affiliate/partner programmes. Respect each source's terms; keep evidence of permission per source in the admin record."),
  B("Every aggregated listing stores: source id, source listing id, canonical outbound URL, first-seen and last-seen timestamps."),
  B("Attribution ('via {SourceName}') is always visible on cards, detail pages, alert emails and structured data (directApply=false)."),
  B("Outbound clicks route through a tracked redirect (for analytics and future CPC) that never masks the destination domain in the UI."),
  H2("7.7 Transactional email inventory"),
  B("Candidate: verify email, apply confirmation, application status change, alert digests, alert confirmation (double opt-in), password reset, account deletion confirmation, CV-retention renewal notice."),
  B("Employer: verify email, first-post approval/rejection, new-application notification or daily digest, expiry reminders (7d, 1d), repost confirmation."),
  B("All emails: plain, fast, mobile-first templates; List-Unsubscribe headers; sent from a warmed transactional domain; every send logged (Section 9.3)."),
  H2("7.8 Analytics events (fire only after consent)"),
  B("search_performed (filters as properties), job_viewed, apply_started, apply_completed, outbound_apply_clicked, job_saved, alert_created, alert_email_clicked, cv_uploaded, employer_registered, job_posted, applicant_status_changed. These twelve events power every KPI in Section 1.4 — instrument them from day one."),
];

/* ================================================================== */
/* 8. DESIGN SYSTEM                                                    */
/* ================================================================== */
const s8 = [
  H1("8. UI/UX Design System"),
  H2("8.1 Direction"),
  P("Light, airy, high-contrast and speed-led. Orbit Jobs sits in the utility school of job-site design — search-first, minimal chrome, instant feedback — warmed up with an editorial layer (confident oversized type, generous whitespace, human photography)."),
  P([
    new TextRun({ text: "The Orbit motif. ", font: FONT, size: 21, bold: true, color: INK }),
    new TextRun({ text: "The brand idea is 'your career in motion'. Express it with restraint: thin elliptical ring accents behind hero illustrations, circular image containers and avatar rings, dotted-arc section dividers, and a small ring around the logo mark. No dark cosmic theme, no starfields, no planets — the look stays light and human; the orbit is a line accent, not a scene.", font: FONT, size: 21, color: BODY }),
  ]),
  H2("8.2 Colour tokens"),
  table([2500, 1800, 4726], [
    ["Token", "Value", "Use"],
    ["surface-base", "#FFFFFF", "Default page background"],
    ["surface-subtle", "#F7F8FC", "Alternating section bands"],
    ["surface-muted", "#EEF1F8", "Filter panels, table headers, disabled fields"],
    ["surface-brand-tint", "#EDEBFB", "Hero wash, highlight blocks"],
    ["surface-accent-tint", "#FFF6DE", "Stat blocks, callouts"],
    ["surface-inverse", "#171633", "Footer, employer band"],
    ["brand-600", "#4F46B8", "Primary actions, links, active states, focus ring"],
    ["brand-700", "#3E369A", "Primary hover"],
    ["brand-500", "#6F66D6", "Illustrations, gradients"],
    ["brand-100", "#E2DFFA", "Chips, avatar rings, soft fills"],
    ["accent-500", "#F2B705", "Employer-track buttons, stat numerals, ring accents"],
    ["accent-100", "#FFF1CC", "Accent chips"],
    ["text-strong", "#14142B", "Headings"],
    ["text-body", "#3F4054", "Paragraphs"],
    ["text-muted", "#6B6C80", "Metadata, captions, hints, 'salary not disclosed'"],
    ["success / warning / error / info", "#12805C / #B26A00 / #C0392B / #1F6FB2", "Feedback states, status pills"],
    ["border-subtle / border-strong", "#E3E6EF / #C6CADB", "Card and input borders"],
  ]),
  spacer(),
  B("Accessibility floor: every text/background pair meets WCAG AA (4.5:1 body, 3:1 large text). The accent yellow never carries text on white — it is a fill behind dark text or a large numeral colour only after a contrast check. Links on light surfaces are brand-600 with underline on hover."),
  H2("8.3 Typography"),
  B("Display and headings: a geometric sans (Sora or Outfit), weight 600, 700 sparingly. Body: Inter (or Source Sans 3), weights 400/500. Self-hosted, subset, font-display: swap."),
  B("Scale (desktop / mobile): display 76/40, h1 56/34, h2 40/28, h3 28/22, h4 21/18, body-lg 19/17, body 17/16, small 15, caption 13 (px). Line height 1.05 display, 1.2 headings, 1.6 body. Tracking −0.02em on display/headings."),
  B("Maximum body measure 68 characters; never full-width paragraphs on desktop. Sentence case everywhere including buttons — no shouting caps."),
  H2("8.4 Spacing, radii, elevation, grid"),
  B("Spacing scale: 4, 8, 12, 16, 24, 32, 40, 56, 72, 96, 128px. Section rhythm 96px desktop / 56px mobile."),
  B("Grid: 12 columns, 1280px max content, 1440px max full-bleed, gutters 24px desktop / 16px mobile. Breakpoints: 360, 768, 1024, 1280."),
  B("Radii: pill buttons 999px, cards 20px, inputs 12px, chips 999px, images 16px, modals 24px."),
  B("Elevation: card rest 0 2px 6px rgba(20,20,43,.06); hover 0 12px 28px rgba(20,20,43,.12); dropdown 0 16px 40px rgba(20,20,43,.14); modal 0 24px 64px rgba(20,20,43,.22)."),
  H2("8.5 Core components"),
  B("Buttons — primary: brand-600 fill, white label, pill, 48px, hover brand-700 + 1px lift. Secondary (employer track): accent-500 fill, text-strong label, same geometry. Tertiary: transparent, 1.5px brand border. Text-link with a chevron that slides 4px on hover."),
  B("JobCard, JobCardCompact, SalaryBadge, SourceBadge, SaveHeart, JobMetaRow, StickyApplyBar, ApplyForm, SimilarJobsCarousel, JobAlertForm."),
  B("FilterPanel, FilterChipRow, RangeSlider, SortSelect, ResultCount, LoadMore, Pagination, SkeletonCard, EmptyState."),
  B("CompanyCard, CompanyProfileHeader, FollowButton, WizardStepper, DashboardTable, StatusPill, ApplicantRow, NotesField, CSVExportButton."),
  B("SpecialismTile and grid, StatBlock with count-up, TestimonialCarousel, ArticleCard, TopicBar, AuthorByline, ShareRow, Accordion, Tabs, Modal, Toast, Breadcrumb, BackLink, PairedCTABlock, AnnouncementBar, CookieBanner, ConsentCentre, MegaPanel, MobileDrawer, NewsletterForm."),
  B("Form primitives: TextField, EmailField, PhoneField, Select, TypeAheadLocation, ConditionalField, FileUpload with progress, Textarea, Checkbox, RadioGroup, FieldError, FormSuccessPanel."),
  H2("8.6 Motion and interaction"),
  B("Rotating hero word: 3–4s cycle, fade + slight vertical shift; static under prefers-reduced-motion."),
  B("Scroll reveals: fade-up 16px over 400ms, 60ms stagger, once only. Stat counters: 1.4s count-up at 50% visibility; final value immediately under reduced motion."),
  B("Header: transparent → solid over 200ms with soft shadow. Drawer: 260ms slide with overlay fade; sub-panels slide horizontally with a back affordance."),
  B("Card hover: 4px lift, deeper shadow, link chevron slides 4px, image scales 1.03 inside a fixed-ratio clip."),
  B("Carousels: CSS scroll-snap, desktop arrows, dots + position count, full keyboard support."),
  B("Conditional form fields animate height smoothly and move focus into the revealed field. Skeletons always match final layout dimensions. Reduced motion disables transforms globally."),
  H2("8.7 States and feedback"),
  B("Every async surface has four designed states: loading (skeleton), success, empty (helpful, with next actions) and error (plain-English message + retry). Toasts for non-blocking confirmations (saved, alert created); inline panels for blocking outcomes (apply success)."),
  H2("8.8 Voice and microcopy"),
  B("Plain English, sentence case, warm but direct. Buttons say what they do ('Post a job', 'Create alert'). Never blame the user in errors. The salary nudge is encouraging, not preachy. British English throughout Phase 1 (localised per market in Phase 2)."),
];

/* ================================================================== */
/* 9. FORMS & DATA MODEL                                               */
/* ================================================================== */
const s9 = [
  H1("9. Forms, Validation and Data Model"),
  H2("9.1 Global form rules"),
  B("Labels always visible above fields; placeholders never replace labels."),
  B("Validate on blur, then live after first error; never on every keystroke before first blur. Errors beneath fields in red with an icon; on submit failure, a summary above the form anchor-links to each bad field."),
  B("Required-consent checkboxes are separate from marketing opt-ins; opt-ins never pre-ticked; report double opt-in where email addresses arrive unauthenticated."),
  B("Every form has a distinct success state stating what happens next and when."),
  B("Anti-spam: honeypot + time-trap + rate limiting on all public forms; a user-operated challenge only as escalation."),
  B("File uploads: PDF, DOC, DOCX; 5 MB cap; name + size shown with a remove control; progress bar; server-side virus scan; private storage."),
  H2("9.2 Forms inventory"),
  table([2900, 6126], [
    ["Form", "Fields"],
    ["Quick CV Drop-off (global modal)", "Name, email, specialism, CV file or profile URL, marketing opt-in, required consent"],
    ["Upload CV (page)", "As above + current title; optional: desired salary, notice period, preferred locations, work model"],
    ["Job application (direct jobs)", "First name, last name, email, phone, CV file or URL, message (optional), screening answers (if set), required consent"],
    ["Post a job (wizard)", "Section 5.8 — basics, details, review"],
    ["Register — candidate", "Name, email, password, optional CV"],
    ["Register — employer", "Company name, website, contact name, work email, password"],
    ["Sign in", "Email, password, keep-me-signed-in; magic-link alternative"],
    ["Job alert", "Email (if not signed in) + captured filter set + frequency"],
    ["Contact", "Reason select, name, email, message, consent"],
    ["Newsletter (footer)", "Email + consent"],
  ]),
  spacer(),
  H2("9.3 Data entities"),
  P("Fields listed are the minimum; all entities carry id, created_at, updated_at. Country fields exist from day one (Section 11.4)."),
  BL("Job", "title, slug, description_rich, specialism, industry, seniority, job_type, work_model, location {country, region, city, lat/lng, remote_flag}, salary {min, max, period, currency, disclosed}, class (direct | aggregated), employer_id (direct), source {source_id, source_listing_id, outbound_url, first_seen, last_seen, also_on[]} (aggregated), screening_questions[], apply_method (native | external_url), external_apply_url, status, posted_at, valid_through, views, applies, featured_flag (reserved, Phase 3), reference."),
  BL("Employer", "company_name, slug, website, logo, industry, about_rich, verified_status, contact {name, email}, country, moderation_notes, seats (1 in Phase 1)."),
  BL("Candidate", "name, email, phone, password_hash, verified, cv_files[] {file, primary_flag, uploaded_at, retention_expiry}, desired_salary, preferred_locations[], work_model, marketing_consent {flag, timestamp, version}, country."),
  BL("Application", "job_id, candidate_id (nullable for guest applies), name, email, phone, cv_file, message, screening_answers[], status (submitted | viewed | shortlisted | contacted | rejected), status_history[], source (search | alert | similar | direct)."),
  BL("SavedJob / SavedSearch (Alert)", "candidate_id or email, job_id / filter_set (canonical JSON), frequency, confirmed_flag, last_sent_at, active."),
  BL("Source", "name, adapter_type (feed | api | partner), field_map (config), schedule, permission_evidence, health {last_run, in, out, errors, dead_links}, active, country."),
  BL("Specialism / Industry", "name, slug, hero copy, intro, illustration ref, accent tint, popular_titles[] {title, definition}, faqs[], meta title/description — per country from Phase 2."),
  BL("AdviceArticle", "title, slug, topic, excerpt, hero image, body_rich, author, published_at, reading_time."),
  BL("Testimonial", "quote, name, role, company, type (candidate | employer)."),
  BL("AdminUser / AuditEvent / EmailLog", "admin identity + role; every admin action (actor, action, target, timestamp, reason); every transactional send (template, recipient, status)."),
  H2("9.4 Job lifecycle"),
  table([2200, 6826], [
    ["State", "Meaning and transitions"],
    ["Draft", "Autosaved wizard progress; visible only to its employer. → In review (first post) or Live."],
    ["In review", "First posting from a new employer awaiting moderation. → Live (approve) or Rejected (templated reason)."],
    ["Live", "Public and indexed. → Paused (employer), Closed (employer), Expired (30-day term or source removal)."],
    ["Paused", "Hidden but editable; does not extend the term. → Live or Closed."],
    ["Expired / Closed", "Public URL returns the 410 expired template with similar roles. → Live again via one-click repost (new posted_at)."],
    ["Archived", "Retained for reporting per the retention policy; never public."],
  ]),
];

/* ================================================================== */
/* 10. NON-FUNCTIONAL                                                  */
/* ================================================================== */
const s10 = [
  H1("10. Accessibility, SEO, Performance, Privacy and Security"),
  H2("10.1 Accessibility — WCAG 2.2 AA"),
  B("Semantic landmarks (one header/nav/main/footer), skip-to-content first in tab order, one H1 per page, no skipped heading levels."),
  B("Visible focus rings everywhere (focus-ring token: 3px brand with 2px white offset); full keyboard operation of mega panel, drawer, carousels, accordions, modals (focus trap + Escape); icon-only controls carry accessible names."),
  B("Form fields programmatically associated with labels and errors (aria-describedby, aria-invalid); result counts and filter updates announced via a polite live region."),
  B("Meaningful alt text; decorative illustration hidden from AT. 200% zoom and 320px viewports without horizontal scroll. Automated axe checks in CI plus a manual screen-reader pass before launch (Section 13)."),
  H2("10.2 SEO"),
  B("Title/meta patterns, CMS-overridable: job — '{Title} at {Company} — {City} | Orbit Jobs'; specialism — '{Family} Jobs in the UK | Orbit Jobs'; programmatic combos ('{Family} jobs in {City}') generated only above a minimum live-jobs threshold to avoid thin pages."),
  B("Structured data: Organization, WebSite + SearchAction, BreadcrumbList, JobPosting (every live role, validating), FAQPage, Article. Expired jobs → 410 template; parameterised search pages noindex,follow; canonicals everywhere."),
  B("XML sitemaps split by type with lastmod (pages, jobs, specialisms, industries, companies, advice); human sitemap page; robots.txt disallows account, dashboard and outbound-redirect paths."),
  B("Deep internal linking: footer specialism list, mega-panel latest advice, similar jobs, related advice, companies ↔ jobs. Open Graph/Twitter images per content type."),
  B("Phase 2 note: /us/ mirror pages pair with UK equivalents via hreflang en-GB/en-US (Section 11.3)."),
  H2("10.3 Performance"),
  B("Budgets on mobile: LCP < 2.5s, INP < 200ms, CLS < 0.1; JavaScript under 200KB gzipped on marketing pages; Lighthouse budgets enforced in CI on the four key templates (home, search, job detail, specialism)."),
  B("Server-render marketing pages; statically generate specialism/industry/advice with incremental revalidation; job search renders client-side against the search API with server-rendered first page for crawlers."),
  B("AVIF/WebP responsive images with explicit dimensions; lazy-load below the fold; preload hero asset + two font weights; flat colour and SVG instead of photographic backgrounds; skeletons reserve space for all async content."),
  H2("10.4 Privacy — UK GDPR"),
  B("Lawful bases documented per processing activity; privacy notice in plain English. No PII in URLs, ever."),
  B("Consent: no analytics/marketing tags before opt-in; Reject All equals Accept All in prominence; consent stored with version and re-prompted on change; auditable record."),
  B("Retention: CVs 12 months from last activity with a renewal email at 11 months; applications visible to the employer for 12 months, then anonymised; deleted accounts purged within 30 days. Self-service data export and deletion (Section 5.10)."),
  B("Processor register (hosting, email, analytics, AV scanning) with DPAs; data-breach runbook; ICO registration. Phase 2 adds CCPA/CPRA notices for US users (Section 11.5)."),
  H2("10.5 Security"),
  B("OWASP ASVS-aligned: parameterised queries, output encoding, CSRF protection, strict CSP, HTTPS-only with HSTS."),
  B("Passwords argon2id-hashed; rate limits on auth, forms and search API; session invalidation on password reset; RBAC separating candidate, employer, admin."),
  B("CV files: private object storage, signed short-lived URLs, virus scanning on upload, access-logged. Full audit log of admin actions. Automated dependency scanning; backups with tested restore; RPO 24h, RTO 4h; 99.9% availability target."),
];

/* ================================================================== */
/* 11. US EXPANSION                                                    */
/* ================================================================== */
const s11 = [
  H1("11. Phase 2 — The US Jobs Tab"),
  H2("11.1 Principle"),
  P("The US market is the same product pointed at different data: identical templates, components, flows and rules, scoped to a second country. No forked code, no second codebase, no redesign. If a Phase 2 task requires touching a component's logic rather than its configuration, Phase 1 got it wrong."),
  H2("11.2 Navigation and switching"),
  B("A 'US Jobs' tab appears beside 'UK Jobs' in the header strip and in the footer. The active tab sets the market context: search scope, currency and salary formats, featured content, employer posting default."),
  B("The choice persists per user (cookie + profile field). A geo-IP hint may suggest the other market as a dismissible banner; never force-redirect."),
  B("Cross-market rule: UK searches never return US jobs and vice versa. A candidate may hold saved jobs and alerts in both markets under one account; each alert is single-market."),
  H2("11.3 URLs and SEO"),
  B("UK keeps its Phase 1 URLs unchanged — no migration, no SEO risk. The US mirror lives under /us/: /us/jobs/, /us/jobs/{slug}-{id}/, /us/specialisms/{slug}/, /us/industries/{slug}/, /us/companies/, /us/employers/, /us/advice/."),
  B("hreflang en-GB/en-US pairs between equivalent pages; separate XML sitemaps per market; US pages get US-specific meta patterns ('{Family} Jobs in the US | Orbit Jobs')."),
  H2("11.4 Phase 1 obligations that make Phase 2 cheap (all MUST, all launch-blocking)"),
  table([3300, 5726], [
    ["Obligation", "Detail"],
    ["Country on every entity", "Job, Employer, Alert, Source, Specialism/Industry copy carry a country value from day one; Phase 1 writes 'UK' everywhere."],
    ["Currency-aware money", "Salary stores {min, max, period, currency}; one formatting utility renders £/$ correctly; nothing assumes GBP."],
    ["Country-partitioned search", "The index is partitioned (or filtered at the engine level) by country; queries are always country-scoped."],
    ["Two-level location taxonomy", "country → region (UK region / US state) → city, with lat/lng. UK data loads in Phase 1; the schema already fits US states and metros."],
    ["Routable market context", "Page templates receive market as a parameter; UK routes pass 'uk' implicitly. Adding /us/ is a routing table entry, not new pages."],
    ["Market-aware formats", "Dates, spelling and salary-period conventions resolve through a locale layer (en-GB now, en-US ready)."],
    ["Config-driven sources", "Aggregation adapters are configuration records with a country field — US sources are new rows, not new code."],
  ]),
  spacer(),
  H2("11.5 US-specific additions (build in Phase 2, plan now)"),
  B("Locations: state + metro-area filters; 'Remote (US)' scope with state-eligibility flags on postings."),
  B("Salary-transparency law flags: postings targeting jurisdictions that mandate pay ranges (e.g. New York City, Colorado, California, Washington) hard-require a range in the wizard — the Phase 1 nudge becomes a conditional requirement."),
  B("Visa sponsorship filter ('H-1B/visa sponsorship available') as a posting field and search filter — a genuine differentiator in the US market."),
  B("EEO statement support on employer postings; US privacy additions (CCPA/CPRA notice and 'do not sell/share' handling); US legal-page variants."),
  B("USD payroll conventions: annual and hourly are both first-class salary periods in US display."),
  H2("11.6 Phase 2 acceptance criteria"),
  B("Every Section 13.3 criterion passes on the /us/ estate."),
  B("No cross-market bleed in search, alerts, sitemaps or structured data; currency always matches market; hreflang validates."),
  B("The UK estate is byte-identical in behaviour before and after the US launch (regression suite passes untouched)."),
];

/* ================================================================== */
/* 12. TECH APPROACH                                                   */
/* ================================================================== */
const s12 = [
  H1("12. Recommended Technical Approach"),
  P("Recommendations, not mandates — substitute equivalents freely, but keep the responsibilities separated as below."),
  BL("Framework", "Next.js (App Router, TypeScript). Server-render marketing pages; statically generate specialism/industry/advice with incremental revalidation; client-render search against the API with an SSR first page."),
  BL("Styling", "Tailwind CSS with Section 8 tokens as CSS custom properties. No hard-coded colours anywhere."),
  BL("Database", "PostgreSQL (e.g. Supabase or RDS) for entities in Section 9.3; row-level security or service-layer RBAC."),
  BL("Search", "Typesense, Meilisearch or Algolia; one collection partitioned by country; faceting for all Section 5.2 filters; typo tolerance and synonyms."),
  BL("Aggregation pipeline", "Scheduled workers (cron/queue) running per-source adapters driven by field-map configs; idempotent upserts; the dedup, classify and expiry stages from Section 6.4; dead-letter queue with admin visibility."),
  BL("Files", "Private S3-compatible storage for CVs; signed URLs; AV scan on upload (e.g. ClamAV lambda)."),
  BL("Email", "Transactional provider (Postmark/Resend/SES) with template management, List-Unsubscribe, webhook-fed EmailLog."),
  BL("Auth", "Email/password + magic link; argon2id; session cookies (httpOnly, SameSite); optional social SSO later."),
  BL("Admin", "A lightweight internal panel (custom route group or Retool-class tool) covering Section 7.5 — must enforce the same RBAC and audit logging."),
  BL("Analytics", "Privacy-first product analytics (e.g. Plausible + a first-party event pipeline for Section 7.8 events), loaded only after consent."),
  BL("Hosting & CI", "Edge CDN, image optimisation, preview deployments per branch; CI runs unit + integration tests, axe accessibility checks and Lighthouse budgets on the four key templates."),
  BL("Monitoring", "Error tracking (Sentry-class), uptime checks, source-health alerting, structured logs."),
];

/* ================================================================== */
/* 13. BUILD PLAN                                                      */
/* ================================================================== */
const s13 = [
  H1("13. Build Plan, Milestones and Acceptance Criteria"),
  H2("13.1 Build order"),
  table([1500, 7526], [
    ["Stage", "Contents"],
    ["0. Foundations", "Design tokens, typography, component library in isolation (Storybook-class), repo, CI, environments."],
    ["1. Chrome & consent", "Announcement bar, header + mega panel + drawer, footer, cookie/consent layer, legal page shells."],
    ["2. Core product", "Search index + API, job search page, job detail, native apply, outbound apply, similar jobs, JobPosting schema. The product is demoable at the end of this stage."],
    ["3. Accounts", "Candidate auth, saves, alerts + email digests, candidate dashboard, CV manager, Quick CV Drop-off."],
    ["4. Employer side", "Employer auth + verification, post-a-job wizard, employer dashboard, applicant pipeline, moderation queue + admin panel."],
    ["5. SEO estate", "Home, candidate/employer hubs, 12 specialism pages, 8 industry pages, companies, advice hub + 12 launch articles, about/contact."],
    ["6. Aggregation hardening", "Remaining source adapters, dedup tuning, health dashboard, expiry sweeps, link checking."],
    ["7. Launch hardening", "Legal copy, sitemaps + structured-data validation, analytics events, performance passes, accessibility audit, load test, backup/restore drill, go-live runbook."],
  ]),
  spacer(),
  H2("13.2 Suggested timeline (single senior team, indicative)"),
  B("Weeks 1–2 stages 0–1 · Weeks 3–5 stage 2 · Weeks 6–7 stage 3 · Weeks 8–9 stage 4 · Weeks 10–11 stage 5 · Week 12 stages 6–7 and launch. Aggregation adapter work runs in parallel from week 3."),
  H2("13.3 Launch acceptance criteria"),
  B("Every page offers a candidate action and an employer action above the fold or in the closing block."),
  B("A candidate can search, filter and open a job with full state in the URL; refresh, back and share all preserve state."),
  B("A candidate can apply to a direct job in under 60 seconds on a mobile device without an account, and receives a confirmation email."),
  B("Aggregated listings always show source attribution and open the source apply in a new tab through the tracked redirect."),
  B("An employer can register, verify, and publish a job in under 5 minutes; the first post passes through moderation with a decision email."),
  B("Applicant status changes appear in the candidate's tracker; rejection emails use the kind template."),
  B("Alerts send only new, deduplicated roles; one-click unsubscribe works from every email."),
  B("Quick CV Drop-off opens and submits from every page, including over modals."),
  B("Duplicate rate in the top 20 results under 3% on the test query set; dead outbound links under 2% weekly."),
  B("JobPosting structured data validates for every live role; expired roles return the 410 template with similar jobs."),
  B("No third-party tag fires before consent; Reject All is honoured session-wide."),
  B("Core Web Vitals pass on mobile for home, search, job detail and one specialism page; axe reports zero critical issues; a manual screen-reader pass of the apply flow succeeds."),
  B("All Section 11.4 US-readiness obligations verified (country fields, partitioned index, currency utility, market-parameterised routes)."),
  B("All copy, imagery and illustration are original to Orbit Jobs."),
];

/* ================================================================== */
/* APPENDICES                                                          */
/* ================================================================== */
const appendix = [
  H1("Appendix A — Launch Taxonomies"),
  H2("A.1 Specialisms (job families)"),
  B("Technology · Finance & Accounting · Sales · Marketing · Engineering · Healthcare · Human Resources · Operations & Supply Chain · Legal · Customer Experience · Education · Construction."),
  H2("A.2 Industries"),
  B("Fintech · Healthcare & Life Sciences · Manufacturing · Retail & E-commerce · Professional Services · Public Sector · Energy · Media."),
  H2("A.3 UK location taxonomy (level 1)"),
  B("London · South East · South West · East of England · East Midlands · West Midlands · Yorkshire & the Humber · North West · North East · Scotland · Wales · Northern Ireland · Remote (UK)."),
  H1("Appendix B — Launch Content Checklist"),
  B("12 specialism pages with distinct copy, popular-title definitions and FAQs; 8 industry pages; 12 career-advice articles (CV, interviews, salary negotiation, notice periods, remote work, career changes — split across candidate and employer topics); legal set reviewed by counsel; 8–10 seeded testimonials with permission; email templates (Section 7.7) written and tested; empty/error/expired state copy for every surface."),
  H1("Appendix C — Glossary"),
  BL("Direct job", "a listing posted by a verified employer on Orbit Jobs with native applications."),
  BL("Aggregated job", "a listing ingested from a permitted external source, attributed and linking out to apply."),
  BL("Market", "a country context (UK at launch, US in Phase 2) scoping jobs, search, currency and content."),
  BL("Specialism", "a job family used for navigation, filtering and SEO landing pages."),
  BL("Talent pool", "candidates who submitted a CV via Upload CV / Quick CV Drop-off with consent, without applying to a specific role."),
];

/* ================================================================== */
/* DOCUMENT                                                            */
/* ================================================================== */
const doc = new Document({
  features: { updateFields: true },
  numbering,
  styles: {
    default: {
      document: { run: { font: FONT, size: 21, color: BODY } },
    },
  },
  sections: [
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
              children: [
                new TextRun({ text: "Orbit Jobs — Website Build Specification v1.0", font: FONT, size: 16, color: MUTED }),
                new TextRun({ children: ["\t"], font: FONT, size: 16, color: MUTED }),
                new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: MUTED }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...cover, ...howTo,
        ...s1, pageBreak(),
        ...s2, pageBreak(),
        ...s3, pageBreak(),
        ...s4, pageBreak(),
        ...s5, pageBreak(),
        ...s6, pageBreak(),
        ...s7, pageBreak(),
        ...s8, pageBreak(),
        ...s9, pageBreak(),
        ...s10, pageBreak(),
        ...s11, pageBreak(),
        ...s12, pageBreak(),
        ...s13, pageBreak(),
        ...appendix,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(process.argv[2] || "OrbitJobs-Build-Spec.docx", buf);
  console.log("Written", (buf.length / 1024).toFixed(1), "KB");
});
