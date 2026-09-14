import { getSessionUser } from "@/lib/auth";
import { listRolesForUser } from "@/server/queries/roles";
import { RoleManager } from "@/components/console/RoleManager";

export const metadata = { title: "Roles — Kids AI Console" };

export default async function RolesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const roles = await listRolesForUser(user.id);
  const systemRoles = roles.filter((role) => role.is_system);
  const myRoles = roles.filter((role) => !role.is_system);

  return (
    <RoleManager
      systemRoles={systemRoles.map((role) => ({ ...role, temperature: Number(role.temperature) }))}
      myRoles={myRoles.map((role) => ({ ...role, temperature: Number(role.temperature) }))}
    />
  );
}
