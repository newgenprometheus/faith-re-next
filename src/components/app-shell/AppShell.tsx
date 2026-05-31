"use client";

import Link from "next/link";
import { Command, Search, Sparkles } from "lucide-react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar, type ShellUser } from "./AppSidebar";
import { CommandMenu } from "./CommandMenu";
import { KeepWarmToggle } from "./KeepWarmToggle";
import { ThemeToggle } from "@/components/theme-toggle";


/**
 * Coquille applicative — sidebar persistante + topbar + palette ⌘K.
 * Importée par /me, /mj, /plateau. La page server passe l'utilisateur + l'onglet actif.
 */
export function AppShell({
  user,
  active,
  title,
  children,
}: {
  user: ShellUser;
  active: "plateau" | "me" | "mj";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} active={active} />
      <CommandMenu user={user} />
      <SidebarInset className="bg-transparent">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/80 bg-background/88 px-4 backdrop-blur-xl">
          <SidebarTrigger className="-ml-1 border border-border/70 bg-card/60 text-ink-muted hover:bg-surface-overlay hover:text-foreground" />
          <Separator orientation="vertical" className="mr-1 h-5 bg-border/80" />
          <div className="min-w-0 hidden sm:block">
            {title && (
              <span className="block truncate text-sm font-semibold text-foreground">
                {title}
              </span>
            )}
            <span className="hidden text-[10px] font-mono uppercase tracking-[0.16em] text-foreground-subtle sm:flex sm:items-center sm:gap-1.5">
              <Sparkles className="size-3 text-primary/80" />
              Table active
            </span>
          </div>

          {/* Switcher rapide mobile (Plateau / Fiche / MJ) */}
          <div className="flex sm:hidden items-center bg-surface-3/80 p-0.5 rounded-lg border border-border/40 text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
            <Link
              href="/plateau"
              className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ${
                active === "plateau"
                  ? "bg-card text-primary font-semibold shadow-sm border border-border/10"
                  : "text-foreground-subtle hover:text-foreground"
              }`}
            >
              Table
            </Link>
            <Link
              href="/me"
              className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ${
                active === "me"
                  ? "bg-card text-primary font-semibold shadow-sm border border-border/10"
                  : "text-foreground-subtle hover:text-foreground"
              }`}
            >
              Fiche
            </Link>
            {user.role === "mj" && (
              <Link
                href="/mj"
                className={`px-3 py-1 rounded-md font-mono text-[10px] uppercase tracking-wider transition-all duration-200 ${
                  active === "mj"
                    ? "bg-card text-primary font-semibold shadow-sm border border-border/10"
                    : "text-foreground-subtle hover:text-foreground"
                }`}
              >
                MJ
              </Link>
            )}
          </div>
          <KeepWarmToggle className="ml-auto" />
          <ThemeToggle />
          <button
            type="button"
            aria-label="Rechercher (⌘K)"
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", { key: "k", metaKey: true }),
              );
            }}
            className="flex h-8 items-center gap-2 rounded-md border border-border bg-card/80 px-2.5 text-xs text-foreground-muted transition-colors hover:border-hairline-strong hover:bg-surface-overlay hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Palette</span>
            <kbd className="tabular hidden items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-ink-muted sm:flex">
              <Command className="size-2.5" />
              ⌘K
            </kbd>
          </button>
        </header>
        <div
          className="flex-1 p-4 lg:p-6 xl:p-8"
          // la barre d'onglets sticky de la fiche se cale sous la top-bar (h-14)
          style={{ "--sheet-tabs-top": "3.5rem" } as React.CSSProperties}
        >
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
