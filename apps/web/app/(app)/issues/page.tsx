"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";

import { IssuesList, type IssueSort } from "@/components/issues-list";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

const SORT_OPTIONS: { value: IssueSort; label: string; description: string }[] =
  [
    { value: "status", label: "Status", description: "Grouped by status" },
    {
      value: "priority",
      label: "Priority",
      description: "Grouped by priority",
    },
    { value: "newest", label: "Newest", description: "Most recently created" },
    { value: "oldest", label: "Oldest", description: "Earliest created" },
    {
      value: "number",
      label: "Issue number",
      description: "Highest issue number first",
    },
  ];

export default function AllIssuesPage() {
  const [sortBy, setSortBy] = React.useState<IssueSort>("status");
  const current =
    SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0]!;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">All issues</h1>
          <p className="text-muted-foreground text-xs">{current.description}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <HugeiconsIcon icon={UnfoldMoreIcon} className="size-4" />
              <span>Sort: {current.label}</span>
              <HugeiconsIcon icon={ArrowDown01Icon} className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => setSortBy(v as IssueSort)}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <IssuesList sortBy={sortBy} />
    </div>
  );
}
