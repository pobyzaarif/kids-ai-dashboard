import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSetting } from "@/server/queries/settings";
import { ConsoleShell } from "@/components/console/ConsoleShell";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || user.status !== "active") {
    redirect("/login");
  }

  const siteName = (await getSetting<string>("console.site_name")) ?? "Kids AI Console";

  return (
    <ConsoleShell
      user={{
        display_name: user.display_name,
        email: user.email,
        role: user.role,
      }}
      siteName={siteName}
    >
      {children}
    </ConsoleShell>
  );
}
