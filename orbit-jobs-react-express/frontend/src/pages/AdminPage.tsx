import { usePageMeta } from "@/lib/hooks";
import { AdminView } from "@/components/views/AdminView";

export function AdminPage() {
  usePageMeta("Admin | Orbit Jobs", "Internal operations.");
  return <AdminView />;
}
