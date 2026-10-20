import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { canManage, getSurpriseById } from "@/lib/surprises";
import MemoryManager from "@/components/MemoryManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit memories", robots: { index: false } };

export default async function EditSurprise({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/dashboard/s/${params.id}`);
  const s = await getSurpriseById(params.id);
  if (!s || !canManage(user, s)) notFound();
  return <MemoryManager surpriseId={s.id} slug={s.slug} surpriseTitle={s.title} />;
}
