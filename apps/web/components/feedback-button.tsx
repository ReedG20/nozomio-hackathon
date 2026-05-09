"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatQuestionIcon } from "@hugeicons/core-free-icons";

import { api } from "@/convex/_generated/api";
import { useIsHydrated } from "@/components/use-is-hydrated";

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
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field";
import { Textarea } from "@workspace/ui/components/textarea";

function deriveTitle(body: string): string {
  const trimmed = body.trim();
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? "";
  const source = firstLine.length > 0 ? firstLine : trimmed;
  if (source.length <= 80) return source;
  return `${source.slice(0, 77).trimEnd()}...`;
}

export function FeedbackButton() {
  const submit = useMutation(api.feedback.submit);

  const mounted = useIsHydrated();
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const bodyEmpty = body.trim().length === 0;
  const disabled = bodyEmpty || submitting;

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setBody("");
      setSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      const trimmedBody = body.trim();
      await submit({ title: deriveTitle(trimmedBody), body: trimmedBody });
      toast.success("Thanks for your feedback!");
      setBody("");
      setOpen(false);
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
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
            <DialogDescription>
              Tell us what's on your mind.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="mt-4">
            <Field>
              <FieldLabel htmlFor="feedback-body" className="sr-only">
                Feedback
              </FieldLabel>
              <Textarea
                id="feedback-body"
                placeholder="What would you like to share?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                autoFocus
                required
              />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              {submitting ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
