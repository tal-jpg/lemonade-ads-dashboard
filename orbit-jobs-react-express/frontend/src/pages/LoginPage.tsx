import { usePageMeta } from "@/lib/hooks";
import { LoginView } from "@/components/views/LoginView";

export function LoginPage() {
  usePageMeta("Sign In | Orbit Jobs", "Sign in to Orbit Jobs.");
  return <LoginView />;
}
