import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSurpriseById } from "@/lib/surprises";
import { listThemes } from "@/lib/catalog";
import StagesEditor from "@/components/StagesEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit slides", robots: { index: false } };

export default async function EditStages({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/dashboard/s/${params.id}/stages`);
  const s = await getSurpriseById(params.id);
  if (!s || !canManage(user, s)) notFound();
  return <StagesEditor surpriseId={s.id} themes={await listThemes(true)} />;
}
