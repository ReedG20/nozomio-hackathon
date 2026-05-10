"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";

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

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";

import { AssigneeSelect } from "@/components/assignee-select";

type NewIssueDialogContextValue = {
  open: () => void;
};

const NewIssueDialogContext =
  React.createContext<NewIssueDialogContextValue | null>(null);

export function useNewIssueDialog() {
  const ctx = React.useContext(NewIssueDialogContext);
  if (!ctx) {
    throw new Error(
      "useNewIssueDialog must be used inside <NewIssueDialogProvider>",
    );
  }
  return ctx;
}

export function NewIssueDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const value = React.useMemo<NewIssueDialogContextValue>(
    () => ({ open: () => setOpen(true) }),
    [],
  );

  return (
    <NewIssueDialogContext.Provider value={value}>
      {children}
      <NewIssueDialog open={open} onOpenChange={setOpen} />
    </NewIssueDialogContext.Provider>
  );
}

function NewIssueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useMutation(api.issues.create);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<IssueStatus>("todo");
  const [priority, setPriority] = React.useState<IssuePriority>("none");
  const [assigneeId, setAssigneeId] = React.useState<Id<"users"> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("none");
      setAssigneeId(null);
      setSubmitting(false);
    }
  }, [open]);

  const titleEmpty = title.trim().length === 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (titleEmpty || submitting) return;
    setSubmitting(true);
    try {
      await create({
        title: title.trim(),
        description,
        status,
        priority,
        assigneeId: assigneeId ?? undefined,
      });
      toast.success("Issue created");
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create issue");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>
              Create a new issue to track work, bugs, or ideas.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="mt-4">
            <Field>
              <FieldLabel htmlFor="issue-title">Title</FieldLabel>
              <Input
                id="issue-title"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="issue-description">Description</FieldLabel>
              <Textarea
                id="issue-description"
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              <FieldDescription>
                Markdown is not supported in this minimal version.
              </FieldDescription>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as IssueStatus)}
                >
                  <SelectTrigger>
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
              </Field>
              <Field>
                <FieldLabel>Priority</FieldLabel>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as IssuePriority)}
                >
                  <SelectTrigger>
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
              </Field>
              <Field>
                <FieldLabel>Assignee</FieldLabel>
                <AssigneeSelect
                  value={assigneeId}
                  onChange={setAssigneeId}
                />
              </Field>
            </div>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={titleEmpty || submitting}>
              {submitting ? "Creating..." : "Create issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
