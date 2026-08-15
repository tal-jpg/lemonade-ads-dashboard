import { usePageMeta } from "@/lib/hooks";
import { DashboardView } from "@/components/views/DashboardView";

export function EmployerDashboardPage() {
  usePageMeta("Employer Dashboard | Orbit Jobs", "Manage your listings and applicants.");
  return <DashboardView />;
}
