import { DesignDetail } from "@/components/designs/design-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DesignDetail designId={id} />;
}
