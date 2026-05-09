"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatQuestionIcon } from "@hugeicons/core-free-icons";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useIsHydrated } from "@/components/use-is-hydrated";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";

type Feedback = Doc<"feedback">;

const STATUS_VARIANT: Record<
  Feedback["status"],
  React.ComponentProps<typeof Badge>["variant"]
> = {
  pending: "secondary",
  running: "default",
  succeeded: "outline",
  failed: "destructive",
};

const STATUS_LABEL: Record<Feedback["status"], string> = {
  pending: "Queued",
  running: "Running",
  succeeded: "PR opened",
  failed: "Failed",
};

export function FeedbackButton() {
  const submit = useMutation(api.feedback.submit);

  const mounted = useIsHydrated();
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const history = useQuery(
    api.feedback.listMine,
    open ? {} : "skip",
  );

  const titleEmpty = title.trim().length === 0;
  const bodyEmpty = body.trim().length === 0;
  const disabled = titleEmpty || bodyEmpty || submitting;

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setTitle("");
      setBody("");
      setSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      await submit({ title: title.trim(), body: body.trim() });
      toast.success("Feedback submitted", {
        description: "Watch the status below — a PR link will appear here.",
      });
      setTitle("");
      setBody("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit feedback", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted) {
    return (
      <Button
        size="lg"
        className="fixed right-4 bottom-4 shadow-lg"
        aria-label="Send feedback"
        tabIndex={-1}
      >
        <HugeiconsIcon
          icon={BubbleChatQuestionIcon}
          data-icon="inline-start"
        />
        Feedback
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed right-4 bottom-4 shadow-lg"
          aria-label="Send feedback"
        >
          <HugeiconsIcon
            icon={BubbleChatQuestionIcon}
            data-icon="inline-start"
          />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Tell us what to change. An autonomous agent will open a pull
              request implementing your feedback.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="mt-4">
            <Field>
              <FieldLabel htmlFor="feedback-title">Title</FieldLabel>
              <Input
                id="feedback-title"
                placeholder="e.g. Add a keyboard shortcut to create issues"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="feedback-body">Details</FieldLabel>
              <Textarea
                id="feedback-body"
                placeholder="Describe what you'd like changed and any constraints..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                required
              />
              <FieldDescription>
                The agent runs in an isolated sandbox and opens a PR against
                main. Be specific - smaller asks ship faster.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
            <Button type="submit" disabled={disabled}>
              {submitting ? "Submitting..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </form>
        <Separator className="my-2" />
        <FeedbackHistory items={history} />
      </DialogContent>
    </Dialog>
  );
}

function FeedbackHistory({ items }: { items: Feedback[] | undefined }) {
  if (items === undefined) {
    return (
      <div className="text-muted-foreground text-xs">Loading history…</div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-xs">
        Your past submissions and their PRs will show up here.
      </div>
    );
  }
  const recent = items.slice(0, 5);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground text-xs font-medium">
        Recent submissions
      </div>
      <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-1">
        {recent.map((item) => (
          <FeedbackHistoryItem key={item._id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function FeedbackHistoryItem({ item }: { item: Feedback }) {
  return (
    <li className="border-border rounded-md border p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{item.title}</div>
          <div className="text-muted-foreground mt-0.5 line-clamp-2">
            {item.body}
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[item.status]}>
          {STATUS_LABEL[item.status]}
        </Badge>
      </div>
      {item.status === "succeeded" && item.prUrl ? (
        <div className="mt-1.5">
          <a
            href={item.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            View pull request
          </a>
        </div>
      ) : null}
      {item.status === "failed" && item.errorMessage ? (
        <details className="mt-1.5">
          <summary className="text-destructive cursor-pointer">
            Error details
          </summary>
          <pre className="bg-muted mt-1 max-h-40 overflow-auto rounded p-2 text-[11px] whitespace-pre-wrap">
            {item.errorMessage}
          </pre>
        </details>
      ) : null}
    </li>
  );
}
