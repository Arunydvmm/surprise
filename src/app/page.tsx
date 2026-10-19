import { hasSiteAccess } from "@/lib/site-gate";
import { redirect } from "next/navigation";
import SurpriseExperience from "@/components/SurpriseExperience";
export default async function HomePage() {
  if (!(await hasSiteAccess())) redirect("/unlock");
  return <SurpriseExperience />;
}
