import { usePageMeta } from "@/lib/hooks";
import { WizardView } from "@/components/views/WizardView";

export function PostAJobPage() {
  usePageMeta("Post a Job | Orbit Jobs", "The three-step Orbit Jobs posting wizard.");
  return <WizardView />;
}
