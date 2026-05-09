"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  InboxIcon,
  Logout03Icon,
  MoonIcon,
  Sun02Icon,
  Tag01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@workspace/ui/components/sidebar";

import { useNewIssueDialog } from "@/components/new-issue-dialog";
import { useIsHydrated } from "@/components/use-is-hydrated";

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  pictureUrl?: string | null;
};

const NAV_ITEMS = [
  { href: "/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/issues", label: "All issues", icon: Tag01Icon },
  { href: "/issues/mine", label: "My issues", icon: UserCircleIcon },
] as const;

function initialsFor(user: SidebarUser): string {
  const source = user.name?.trim() || user.email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const newIssue = useNewIssueDialog();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsHydrated();
  const isDark = resolvedTheme === "dark";

  return (
    <Sidebar>
      <SidebarHeader>
        {mounted ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="gap-3 data-[state=open]:bg-sidebar-accent"
              >
                <Avatar className="size-8">
                  <AvatarFallback>{initialsFor(user)}</AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col text-left">
                  <span className="truncate text-sm font-medium">
                    {user.name ?? user.email ?? "User"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email ?? ""}
                  </span>
                </div>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>{user.email ?? "Account"}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTheme(isDark ? "light" : "dark");
                }}
              >
                <HugeiconsIcon
                  icon={isDark ? Sun02Icon : MoonIcon}
                  data-icon="inline-start"
                />
                {isDark ? "Light mode" : "Dark mode"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <form action="/api/sign-out" method="POST" className="w-full">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 text-left"
                  >
                    <HugeiconsIcon icon={Logout03Icon} />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SidebarMenuButton
            size="lg"
            className="gap-3 data-[state=open]:bg-sidebar-accent"
            tabIndex={-1}
          >
            <Avatar className="size-8">
              <AvatarFallback>{initialsFor(user)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col text-left">
              <span className="truncate text-sm font-medium">
                {user.name ?? user.email ?? "User"}
              </span>
              <span className="text-muted-foreground truncate text-xs">
                {user.email ?? ""}
              </span>
            </div>
          </SidebarMenuButton>
        )}
        <Button
          className="mt-2 w-full justify-start"
          size="sm"
          onClick={() => newIssue.open()}
        >
          <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
          New issue
        </Button>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/issues" &&
                    pathname.startsWith(item.href + "/"));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <HugeiconsIcon icon={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <span className="text-muted-foreground px-2 text-xs">
          Press <kbd className="font-mono">d</kbd> to toggle theme
        </span>
      </SidebarFooter>
    </Sidebar>
  );
}
