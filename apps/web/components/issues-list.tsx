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
  PRIORITY_ORDER,
  STATUS_ORDER,
  type IssuePriority,
  type IssueStatus,
  priorityMeta,
  statusMeta,
} from "@/lib/issue-meta";

import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { useNewIssueDialog } from "@/components/new-issue-dialog";
import { UserAvatar } from "@/components/assignee-select";

type IssueWithRefs = Doc<"issues"> & {
  creator: Doc<"users"> | null;
  assignee: Doc<"users"> | null;
};

export type IssueSortKey = "newest" | "oldest" | "priority" | "title";

const PRIORITY_RANK: Record<IssuePriority, number> = PRIORITY_ORDER.reduce(
  (acc, p, i) => {
    acc[p] = i;
    return acc;
  },
  {} as Record<IssuePriority, number>,
);

function compareIssues(
  a: IssueWithRefs,
  b: IssueWithRefs,
  sortBy: IssueSortKey,
): number {
  switch (sortBy) {
    case "oldest":
      return a._creationTime - b._creationTime;
    case "priority":
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    case "title":
      return a.title.localeCompare(b.title);
    case "newest":
    default:
      return b._creationTime - a._creationTime;
  }
}

export function IssuesList({
  filter = "all",
  sortBy = "newest",
  emptyTitle = "No issues yet",
  emptyDescription = "Create your first issue to start tracking work.",
}: {
  filter?: "all" | "mine";
  sortBy?: IssueSortKey;
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
  for (const status of STATUS_ORDER) {
    grouped.get(status)?.sort((a, b) => compareIssues(a, b, sortBy));
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
        <UserAvatar user={issue.assignee} className="size-6" />
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
