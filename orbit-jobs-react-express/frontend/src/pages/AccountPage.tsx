import { usePageMeta } from "@/lib/hooks";
import { AccountView } from "@/components/views/AccountView";

export function AccountPage() {
  usePageMeta("Your Dashboard | Orbit Jobs", "Saved jobs, applications, alerts and your profile.");
  return <AccountView />;
}
