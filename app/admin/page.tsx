import { AdminMenuManager } from "@/components/AdminMenuManager";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminMenu } from "@/lib/menu-data";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const initialMenu = (await isAdminAuthenticated()) ? await getAdminMenu() : [];

  return <AdminMenuManager initialMenu={initialMenu} />;
}
