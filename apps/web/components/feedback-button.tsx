"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { BubbleChatQuestionIcon } from "@hugeicons/core-free-icons";

import { api } from "@/convex/_generated/api";

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
import { Textarea } from "@workspace/ui/components/textarea";

export function FeedbackButton() {
  const submit = useMutation(api.feedback.submit);

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setBody("");
      setSubmitting(false);
    }
  }, [open]);

  const titleEmpty = title.trim().length === 0;
  const bodyEmpty = body.trim().length === 0;
  const disabled = titleEmpty || bodyEmpty || submitting;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      await submit({ title: title.trim(), body: body.trim() });
      toast.success("Feedback submitted", {
        description:
          "An agent is working on it. A pull request will appear when it's done.",
      });
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit feedback", {
        description: err instanceof Error ? err.message : undefined,
      });
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent className="sm:max-w-xl">
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
                rows={6}
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
              Cancel
            </Button>
            <Button type="submit" disabled={disabled}>
              {submitting ? "Submitting..." : "Submit feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
