/** Structured-data builders (schema.org JSON-LD), fed from API payloads. */
import type { Article, PublicJobFull, SpecialismTax } from "./types";

const esc = (s: string) => String(s || "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));

export function jobPostingLD(j: PublicJobFull): object {
  const salary = j.salary.disclosed
    ? {
        "@type": "MonetaryAmount",
        currency: j.salary.currency || "GBP",
        value: {
          "@type": "QuantitativeValue",
          minValue: j.salary.min,
          maxValue: j.salary.max,
          unitText: ({ year: "YEAR", day: "DAY", hour: "HOUR" } as Record<string, string>)[j.salary.period],
        },
      }
    : undefined;
  return {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: j.title,
    description: `<p>${esc(j.description.intro)}</p>`,
    datePosted: j.postedAt,
    validThrough: j.validThrough,
    employmentType: ({ permanent: "FULL_TIME", contract: "CONTRACTOR", temporary: "TEMPORARY", "part-time": "PART_TIME", apprenticeship: "OTHER" } as Record<string, string>)[j.jobType],
    hiringOrganization: { "@type": "Organization", name: j.companyName },
    jobLocation: {
      "@type": "Place",
      address: { "@type": "PostalAddress", addressLocality: j.location.city, addressRegion: j.location.region, addressCountry: j.location.country === "US" ? "US" : "GB" },
    },
    applicantLocationRequirements: j.workModel === "remote"
      ? { "@type": "Country", name: j.location.country === "US" ? "United States" : "United Kingdom" }
      : undefined,
    jobLocationType: j.workModel === "remote" ? "TELECOMMUTE" : undefined,
    directApply: j.class === "direct",
    baseSalary: salary,
    identifier: { "@type": "PropertyValue", name: "Orbit Jobs", value: j.reference },
  };
}

export function faqPageLD(faqs: SpecialismTax["faqs"]): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

export function articleLD(a: Article): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    datePublished: a.date,
    author: { "@type": "Organization", name: a.author },
  };
}
