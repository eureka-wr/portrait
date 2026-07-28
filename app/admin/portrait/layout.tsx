import { requirePortraitActor } from "../../../src/modules/portrait/auth";

export const dynamic = "force-dynamic";

export default async function PortraitAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePortraitActor("/admin/portrait");
  return children;
}

