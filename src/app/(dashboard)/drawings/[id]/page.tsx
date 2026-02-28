import { DrawingDetail } from "@/components/drawings/drawing-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DrawingDetail id={id} />;
}
