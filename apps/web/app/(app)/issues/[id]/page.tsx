"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  Delete02Icon,
  UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  type IssuePriority,
  type IssueStatus,
  priorityMeta,
  statusMeta,
} from "@/lib/issue-meta";

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Textarea } from "@workspace/ui/components/textarea";

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const issueId = params.id as Id<"issues">;

  const issue = useQuery(api.issues.get, { id: issueId });
  const users = useQuery(api.users.list) ?? [];
  const updateIssue = useMutation(api.issues.update);
  const removeIssue = useMutation(api.issues.remove);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const lastSyncedRef = React.useRef<{ title: string; description: string }>({
    title: "",
    description: "",
  });

  React.useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description);
      lastSyncedRef.current = {
        title: issue.title,
        description: issue.description,
      };
    }
  }, [issue?._id, issue?.title, issue?.description]);

  if (issue === undefined) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (issue === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <p className="font-medium">Issue not found</p>
        <Button asChild variant="outline">
          <Link href="/inbox">Back to inbox</Link>
        </Button>
      </div>
    );
  }

  async function commitTitle() {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      setTitle(lastSyncedRef.current.title);
      return;
    }
    if (trimmed === lastSyncedRef.current.title) return;
    try {
      await updateIssue({ id: issueId, title: trimmed });
      lastSyncedRef.current.title = trimmed;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update title");
    }
  }

  async function commitDescription() {
    if (description === lastSyncedRef.current.description) return;
    try {
      await updateIssue({ id: issueId, description });
      lastSyncedRef.current.description = description;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update description");
    }
  }

  async function setStatus(status: IssueStatus) {
    try {
      await updateIssue({ id: issueId, status });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  }

  async function setPriority(priority: IssuePriority) {
    try {
      await updateIssue({ id: issueId, priority });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update priority");
    }
  }

  async function setAssignee(value: string) {
    try {
      await updateIssue({
        id: issueId,
        assigneeId:
          value === "unassigned" ? null : (value as Id<"users">),
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update assignee");
    }
  }

  async function onDelete() {
    try {
      await removeIssue({ id: issueId });
      toast.success("Issue deleted");
      router.push("/inbox");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete issue");
    }
  }

  const status = statusMeta[issue.status as IssueStatus];
  const priority = priorityMeta[issue.priority as IssuePriority];
  const assigneeInitials = issue.assignee
    ? (issue.assignee.name ?? issue.assignee.email).slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/inbox">
              <HugeiconsIcon icon={ArrowLeft01Icon} />
            </Link>
          </Button>
          <span className="text-muted-foreground font-mono text-xs">
            ENG-{issue.number}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <HugeiconsIcon icon={UnfoldMoreIcon} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                void onDelete();
              }}
            >
              <HugeiconsIcon icon={Delete02Icon} />
              Delete issue
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="h-auto !text-2xl font-semibold border-transparent bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commitDescription}
            placeholder="Add a description..."
            rows={10}
            className="resize-y border-transparent bg-transparent px-0 shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
          <Separator />
          <div className="text-muted-foreground text-xs">
            Created{" "}
            {formatDistanceToNow(new Date(issue._creationTime), {
              addSuffix: true,
            })}
            {issue.creator?.name || issue.creator?.email
              ? ` by ${issue.creator.name ?? issue.creator.email}`
              : null}
          </div>
        </div>
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Properties</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <PropertyRow label="Status">
              <Select
                value={issue.status}
                onValueChange={(v) => void setStatus(v as IssueStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => {
                    const m = statusMeta[s];
                    return (
                      <SelectItem key={s} value={s}>
                        <span className="inline-flex items-center gap-2">
                          <HugeiconsIcon icon={m.icon} className={m.tone} />
                          {m.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </PropertyRow>
            <PropertyRow label="Priority">
              <Select
                value={issue.priority}
                onValueChange={(v) => void setPriority(v as IssuePriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_ORDER.map((p) => {
                    const m = priorityMeta[p];
                    return (
                      <SelectItem key={p} value={p}>
                        <span className="inline-flex items-center gap-2">
                          <HugeiconsIcon icon={m.icon} className={m.tone} />
                          {m.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </PropertyRow>
            <PropertyRow label="Assignee">
              <Select
                value={issue.assigneeId ?? "unassigned"}
                onValueChange={(v) => void setAssignee(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      <span className="inline-flex items-center gap-2">
                        <Avatar className="size-4">
                          <AvatarFallback className="text-[8px]">
                            {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {u.name ?? u.email}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </PropertyRow>
            <Separator />
            <div className="flex items-center gap-2 text-xs">
              <HugeiconsIcon
                icon={status.icon}
                className={`size-4 ${status.tone}`}
              />
              <span className="text-muted-foreground">{status.label}</span>
              <span className="text-muted-foreground">·</span>
              <HugeiconsIcon
                icon={priority.icon}
                className={`size-4 ${priority.tone}`}
              />
              <span className="text-muted-foreground">{priority.label}</span>
            </div>
            {issue.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {issue.assignee.name ?? issue.assignee.email}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}
