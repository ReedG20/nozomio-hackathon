"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tag01Icon } from "@hugeicons/core-free-icons";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  STATUS_ORDER,
  type IssueStatus,
  priorityMeta,
  statusMeta,
} from "@/lib/issue-meta";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useNewIssueDialog } from "@/components/new-issue-dialog";

type IssueWithRefs = Doc<"issues"> & {
  creator: Doc<"users"> | null;
  assignee: Doc<"users"> | null;
};

export function IssuesList({
  filter = "all",
  emptyTitle = "No issues yet",
  emptyDescription = "Create your first issue to start tracking work.",
}: {
  filter?: "all" | "mine";
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const issues = useQuery(api.issues.list);
  const me = useQuery(api.users.current);
  const newIssue = useNewIssueDialog();

  if (issues === undefined) {
    return <IssuesListSkeleton />;
  }

  const filtered: IssueWithRefs[] =
    filter === "mine" && me
      ? issues.filter((i) => i.assigneeId === me._id)
      : issues;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <HugeiconsIcon icon={Tag01Icon} className="size-6" />
        </div>
        <div>
          <p className="font-medium">{emptyTitle}</p>
          <p className="text-muted-foreground text-sm">{emptyDescription}</p>
        </div>
        <Button onClick={() => newIssue.open()}>New issue</Button>
      </div>
    );
  }

  const grouped = new Map<IssueStatus, IssueWithRefs[]>();
  for (const status of STATUS_ORDER) grouped.set(status, []);
  for (const issue of filtered) {
    grouped.get(issue.status as IssueStatus)?.push(issue);
  }

  return (
    <div className="flex flex-col">
      {STATUS_ORDER.map((status) => {
        const group = grouped.get(status) ?? [];
        if (group.length === 0) return null;
        const meta = statusMeta[status];
        return (
          <section key={status} className="border-b last:border-b-0">
            <header className="bg-muted/40 flex items-center gap-2 px-4 py-2">
              <HugeiconsIcon
                icon={meta.icon}
                className={`size-4 ${meta.tone}`}
              />
              <h3 className="text-sm font-medium">{meta.label}</h3>
              <span className="text-muted-foreground text-xs">
                {group.length}
              </span>
            </header>
            <ul className="divide-y">
              {group.map((issue) => (
                <IssueRow key={issue._id} issue={issue} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function IssueRow({ issue }: { issue: IssueWithRefs }) {
  const priority = priorityMeta[issue.priority];
  const status = statusMeta[issue.status];
  const assignee = issue.assignee;
  const initials = assignee
    ? (assignee.name ?? assignee.email).slice(0, 2).toUpperCase()
    : "?";
  return (
    <li>
      <Link
        href={`/issues/${issue._id}`}
        className="hover:bg-muted/40 flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
      >
        <HugeiconsIcon
          icon={priority.icon}
          className={`size-4 shrink-0 ${priority.tone}`}
        />
        <span className="text-muted-foreground w-14 shrink-0 font-mono text-xs">
          ENG-{issue.number}
        </span>
        <HugeiconsIcon
          icon={status.icon}
          className={`size-4 shrink-0 ${status.tone}`}
        />
        <span className="flex-1 truncate font-medium">{issue.title}</span>
        <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
          {formatDistanceToNow(new Date(issue._creationTime), {
            addSuffix: true,
          })}
        </span>
        <Avatar className="size-6 shrink-0">
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
      </Link>
    </li>
  );
}

function IssuesListSkeleton() {
  return (
    <div className="flex flex-col gap-px p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
