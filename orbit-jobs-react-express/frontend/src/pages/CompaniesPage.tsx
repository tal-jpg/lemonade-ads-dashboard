/** Companies directory page. */
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { CompanyCard, Market } from "@/lib/types";
import { CompaniesGrid } from "@/components/views/CompaniesView";
import { PairedCTA } from "@/components/PairedCTA";
import { Skeletons } from "@/components/JobCard";

export function CompaniesPage({ market }: { market: Market }) {
  usePageMeta(
    `Companies Hiring in the ${market} | Orbit Jobs`,
    market === "US" ? "Browse verified employers hiring on Orbit Jobs in the US." : "Browse verified employers hiring on Orbit Jobs.",
  );
  const { data, loading } = useData(async () => {
    const [companies, tax] = await Promise.all([
      api<{ results: CompanyCard[] }>(`/meta/companies?country=${market}`),
      api<{ industries: { slug: string; name: string }[] }>(`/meta/taxonomies?country=${market}`),
    ]);
    return { initial: companies.results, industries: tax.industries };
  }, [market]);

  if (loading || !data) return <div className="container" style={{ paddingTop: 48 }}><Skeletons n={6} /></div>;

  return (
    <>
      <CompaniesGrid market={market} initial={data.initial} industries={data.industries} />
      <PairedCTA market={market} />
    </>
  );
}
