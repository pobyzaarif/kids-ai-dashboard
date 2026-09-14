"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { apiFetch } from "@/lib/client";
import { cn } from "@/lib/cn";

type ShellUser = {
  display_name: string;
  email: string;
  role: "admin" | "user";
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/devices", label: "Devices", icon: "🔌" },
  { href: "/roles", label: "Roles", icon: "🎭" },
];

const ADMIN_NAV_ITEMS = [
  { href: "/admin/settings", label: "Admin Settings", icon: "⚙️" },
];

export function ConsoleShell({
  user,
  siteName,
  children,
}: {
  user: ShellUser;
  siteName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems =
    user.role === "admin" ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  async function logout() {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r-2 border-ink bg-white transition-transform md:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b-2 border-ink bg-brand-yellow px-4 py-4">
          <Link href="/dashboard" className="text-lg font-black uppercase leading-tight">
            {siteName}
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-widest opacity-60">
            Kids AI Console
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 border-2 border-ink px-3 py-2 text-sm font-bold transition-all",
                  active
                    ? "translate-x-0.5 translate-y-0.5 bg-brand-lime shadow-none"
                    : "bg-white shadow-brutal-xs hover:bg-[#f4f1e8]",
                )}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t-2 border-ink p-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            <div className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-brand-pink text-sm font-black">
              {user.display_name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.display_name}</p>
              <Badge tone={user.role === "admin" ? "purple" : "cyan"}>
                {user.role}
              </Badge>
            </div>
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={logout}>
            Log out
          </Button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-60">
        <header className="flex items-center justify-between gap-3 border-b-2 border-ink bg-white px-4 py-3 md:px-6">
          <Button
            variant="secondary"
            size="sm"
            className="md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </Button>
          <p className="hidden text-sm font-bold md:block">
            Welcome back, {user.display_name} 👋
          </p>
          <p className="truncate text-xs font-medium text-gray-500">{user.email}</p>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
