"use client";

import * as React from "react";

import { IssuesList, type IssueSortKey } from "@/components/issues-list";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

const SORT_OPTIONS: { value: IssueSortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
];

export default function AllIssuesPage() {
  const [sortBy, setSortBy] = React.useState<IssueSortKey>("newest");
  const current = SORT_OPTIONS.find((o) => o.value === sortBy);
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">All issues</h1>
          <p className="text-muted-foreground text-xs">
            Every issue, grouped by status
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Sort: {current?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(v) => setSortBy(v as IssueSortKey)}
            >
              {SORT_OPTIONS.map((o) => (
                <DropdownMenuRadioItem key={o.value} value={o.value}>
                  {o.label}
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
