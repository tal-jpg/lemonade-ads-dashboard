/** Domain models — one interface per MongoDB collection document. */

export type Market = "UK" | "US";
export type JobStatus = "draft" | "in_review" | "live" | "paused" | "expired" | "closed";
export type JobClass = "direct" | "aggregated";
export type JobType = "permanent" | "contract" | "temporary" | "part-time" | "apprenticeship";
export type WorkModel = "on-site" | "hybrid" | "remote";
export type Seniority = "junior" | "mid" | "senior" | "lead" | "entry" | "executive";
export type SalaryPeriod = "year" | "day" | "hour";
export type AppStatus = "submitted" | "viewed" | "shortlisted" | "contacted" | "rejected";
export type Role = "candidate" | "employer" | "admin";

export interface Salary {
  min: number | null;
  max: number | null;
  period: SalaryPeriod;
  currency: "GBP" | "USD";
  disclosed: boolean;
}

export interface JobLocation {
  country: Market;
  city: string;
  region: string;
}

export interface JobDescription {
  intro: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
}

export interface ScreeningQuestion {
  q: string;
  kind: "text" | "yesno";
}

export interface JobSource {
  sourceId: string;
  sourceName: string;
  externalId: string;
  outboundUrl: string;
  alsoOn: string[];
  firstSeen?: string;
  lastSeen?: string;
}

export interface Job {
  id: string;
  slug: string;
  reference: string;
  title: string;
  class: JobClass;
  employerId: string | null;
  companyName: string;
  specialism: string;
  industry: string | null;
  seniority: Seniority;
  jobType: JobType;
  workModel: WorkModel;
  location: JobLocation;
  salary: Salary;
  visaSponsorship?: boolean;
  description: JobDescription;
  screeningQuestions: ScreeningQuestion[];
  applyMethod: "native" | "external";
  externalApplyUrl: string | null;
  source?: JobSource;
  needsReview?: boolean;
  status: JobStatus;
  postedAt: string | null;
  validThrough: string | null;
  views: number;
  applies: number;
  outboundClicks?: number;
  featuredFlag: boolean;
  createdAt: string;
}

export interface CV {
  file: string;
  original: string;
  primary: boolean;
  uploadedAt: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  passHash: string;
  verified: boolean;
  sessionVersion: number;
  country: Market;
  employerId?: string | null;
  profile?: {
    phone?: string;
    desiredSalary?: number | null;
    preferredLocations?: string[];
    workModel?: string | null;
    noticePeriod?: string;
  };
  cvs?: CV[];
  marketingConsent?: { flag: boolean; at?: string };
  createdAt: string;
}

export interface Employer {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  city: string | null;
  size: string | null;
  mark: string;
  color: string;
  about: string;
  website: string;
  country: Market;
  verifiedStatus: "verified" | "pending" | "flagged";
  createdAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  candidateId: string | null;
  name: string;
  email: string;
  phone: string;
  cvFile: string | null;
  cvUrl: string | null;
  message: string;
  screeningAnswers: { q: string; a: string }[];
  status: AppStatus;
  statusHistory: { status: string; at: string }[];
  notes?: { note: string; at: string }[];
  external?: boolean;
  source: string;
  appliedAt: string;
}

export interface SavedJob {
  id: string;
  candidateId: string;
  jobId: string;
  at: string;
}

export interface Alert {
  id: string;
  candidateId: string | null;
  email: string;
  name: string;
  filters: Record<string, string>;
  frequency: "instant" | "daily" | "weekly";
  country: Market;
  confirmed: boolean;
  active: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

export interface TalentPoolEntry {
  id: string;
  name: string;
  email: string;
  specialism: string;
  currentTitle: string;
  cvFile: string | null;
  cvUrl: string | null;
  marketing: boolean;
  retentionExpiry: string;
  at: string;
}

export interface Report {
  id: string;
  jobId: string;
  reason: string;
  email: string;
  status: "open" | "resolved";
  at: string;
}

export interface Contact {
  id: string;
  reason: string;
  name: string;
  email: string;
  message: string;
  at: string;
}

export interface NewsletterSub {
  id: string;
  email: string;
  at: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  at: string;
  reason: string;
}

export interface EmailLogEntry {
  id: string;
  template: string;
  to: string;
  status: string;
  at: string;
}

export interface SourceHealth {
  sourceId: string;
  name: string;
  lastRun: string;
  itemsIn: number;
  itemsKept: number;
  merged: number;
  errors: number;
  deadLinks: number;
}

export interface Source {
  id: string;
  name: string;
  adapter_type: string;
  country: Market;
  schedule: string;
  permission_evidence: string;
  active: boolean;
  field_map: Record<string, string>;
  health?: SourceHealth | null;
}

export interface SpecialismTax {
  slug: string;
  name: string;
  tint: string;
  intro: string;
  intro_us?: string;
  popularTitles: { t: string; d: string }[];
  faqs: { q: string; a: string; ukOnly?: boolean }[];
}

export interface IndustryTax {
  slug: string;
  name: string;
  intro: string;
  roles: string[];
}

export interface Taxonomies {
  specialisms: SpecialismTax[];
  industries: IndustryTax[];
  locations: { city: string; region: string }[];
  locations_us: { city: string; region: string }[];
}

export interface Article {
  slug: string;
  topic: string;
  title: string;
  excerpt: string;
  minutes: number;
  author: string;
  date: string;
  body: string[];
}

export interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  type: "candidate" | "employer";
}

/** Public (API-shaped) job summary sent to the browser and rendered in cards. */
export interface PublicJob {
  id: string;
  slug: string;
  reference: string;
  title: string;
  class: JobClass;
  companyName: string;
  companySlug: string | null;
  specialism: string;
  industry: string | null;
  seniority: Seniority;
  jobType: JobType;
  workModel: WorkModel;
  location: JobLocation;
  salary: Salary;
  postedAt: string | null;
  validThrough: string | null;
  status: JobStatus;
  country: Market;
  visaSponsorship: boolean;
  source: { name: string; alsoOn: string[] } | null;
  applyMethod: "native" | "external";
  summary: string;
}

export interface PublicJobFull extends PublicJob {
  description: JobDescription;
  screeningQuestions: ScreeningQuestion[];
  externalApplyUrl: string | null;
  views: number;
  company?: {
    slug: string;
    name: string;
    mark: string;
    color: string;
    about: string;
    industry: string | null;
    liveRoles: number;
  };
}

export interface PublicUser {
  id: string;
  role: Role;
  name: string;
  email: string;
  employerId: string | null;
}

/* ---------- API payload shapes (returned by the Express backend) ---------- */

export interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  results: PublicJob[];
  counts: {
    jobType: Record<string, number>;
    specialism: Record<string, number>;
    workModel: Record<string, number>;
    class: { direct: number; aggregated: number };
  };
}

export interface MarketStats {
  liveJobs: number;
  sources: number;
  addedRecently: number;
  employers: number;
  disclosedShare: number;
  country: Market;
}

export interface CompanyCard {
  slug: string;
  name: string;
  industry: string | null;
  city: string | null;
  size: string | null;
  mark: string;
  color: string;
  liveRoles: number;
}

export interface SpecialismPageData {
  specialism: SpecialismTax;
  jobs: PublicJob[];
  total: number;
  snapshot: { tier: string; median: number; sample: number }[];
  companies: string[];
  country: Market;
}

export interface IndustryPageData {
  industry: IndustryTax;
  jobs: PublicJob[];
  total: number;
  others: { slug: string; name: string }[];
}

export interface CompanyProfileData {
  company: {
    slug: string; name: string; industry: string | null; city: string | null; size: string | null;
    mark: string; color: string; about: string; website: string; country: Market;
  };
  jobs: PublicJob[];
}

export interface GonePayload {
  gone: true;
  job: { title: string; companyName: string; specialism: string; country: Market };
  similar: PublicJob[];
}
