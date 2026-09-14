import { getSessionUser } from "@/lib/auth";
import { listFeatures } from "@/server/queries/features";
import { getSettings } from "@/server/queries/settings";
import { AdminSettings } from "@/components/admin/AdminSettings";

export const metadata = { title: "Admin Settings — Kids AI Console" };

export default async function AdminSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;

  const [features, settings] = await Promise.all([listFeatures(), getSettings()]);

  return <AdminSettings features={features} settings={settings} />;
}
