"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { APP_NAME, cn, LOGO_PATH } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/products", label: "Products" },
  { href: "/history", label: "Stock History" },
  { href: "/low-stock", label: "Low Stock" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={LOGO_PATH}
              alt={APP_NAME}
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-brand">{APP_NAME}</p>
              <p className="text-xs text-muted">Cosmetics Stock Management</p>
            </div>
          </Link>

          <button
            type="button"
            className="rounded-lg border border-border px-3 py-2 text-sm font-medium md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            Menu
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand text-white"
                      : "text-muted hover:bg-background hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {mobileOpen ? (
          <nav className="border-t border-border px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded-xl px-3 py-3 text-sm font-medium",
                      active
                        ? "bg-brand text-white"
                        : "bg-white text-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
