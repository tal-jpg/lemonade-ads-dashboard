import { usePageMeta } from "@/lib/hooks";
import { RegisterView } from "@/components/views/RegisterView";

export function RegisterPage() {
  usePageMeta("Create an Account | Orbit Jobs", "Create your free Orbit Jobs account.");
  return <RegisterView />;
}
