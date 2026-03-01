import { SupportThread } from "@/components/support/support-thread";

export const metadata = { title: "Support Thread — Printforge" };

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupportThread threadId={id} />;
}
