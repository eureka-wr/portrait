import { PortraitStudioApp } from "../../../../../src/modules/portrait/ui/PortraitStudioApp";

export default async function PortraitOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PortraitStudioApp view="order" selectedOrderId={id} />;
}

