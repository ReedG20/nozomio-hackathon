"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { cn } from "@workspace/ui/lib/utils";

type View = "all" | "mine";

export function IssuesViewTabs({ active }: { active: View }) {
  const issues = useQuery(api.issues.list);
  const me = useQuery(api.users.current);
  const mineCount =
    issues && me ? issues.filter((i) => i.assigneeId === me._id).length : null;

  return (
    <nav className="flex gap-1 px-4 pt-1" aria-label="Issue views">
      <TabLink href="/issues" active={active === "all"}>
        All
      </TabLink>
      <TabLink href="/issues/mine" active={active === "mine"}>
        Assigned to me
        {mineCount !== null ? (
          <span
            className={cn(
              "ml-1 rounded-full px-1.5 text-[10px] font-medium tabular-nums",
              active === "mine"
                ? "bg-foreground/10 text-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {mineCount}
          </span>
        ) : null}
      </TabLink>
    </nav>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex items-center px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          "absolute inset-x-2 -bottom-px h-0.5 rounded-full",
          active ? "bg-foreground" : "bg-transparent",
        )}
      />
    </Link>
  );
}
