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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Switch } from "@workspace/ui/components/switch";
import { Textarea } from "@workspace/ui/components/textarea";

function deriveTitle(body: string): string {
  const trimmed = body.trim();
  const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? "";
  const source = firstLine.length > 0 ? firstLine : trimmed;
  if (source.length <= 80) return source;
  return `${source.slice(0, 77).trimEnd()}...`;
}

const PHONE_REGEX = /^(\+?1)?[\s\-.()]*\d{3}[\s\-.()]*\d{3}[\s\-.()]*\d{4}$/;

function isValidPhone(input: string): boolean {
  return PHONE_REGEX.test(input.trim());
}

export function FeedbackButton() {
  const submit = useMutation(api.feedback.submit);

  const mounted = useIsHydrated();
  const [open, setOpen] = React.useState(false);
  const [body, setBody] = React.useState("");
  const [notify, setNotify] = React.useState(false);
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const bodyEmpty = body.trim().length === 0;
  const phoneTrimmed = phone.trim();
  const phoneValid = phoneTrimmed.length > 0 && isValidPhone(phoneTrimmed);
  const phoneError = notify && phoneTrimmed.length > 0 && !phoneValid;
  const disabled =
    bodyEmpty || submitting || (notify && !phoneValid);

  function onOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setBody("");
      setNotify(false);
      setPhone("");
      setSubmitting(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    try {
      const trimmedBody = body.trim();
      await submit({
        title: deriveTitle(trimmedBody),
        body: trimmedBody,
        ...(notify && phoneValid ? { notifyPhone: phoneTrimmed } : {}),
      });
      toast.success("Thanks for your feedback!");
      setBody("");
      setNotify(false);
      setPhone("");
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
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="feedback-notify">
                  Text me when it's fixed
                </FieldLabel>
                <FieldDescription>
                  We'll iMessage you as soon as your request goes live.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="feedback-notify"
                checked={notify}
                onCheckedChange={setNotify}
              />
            </Field>
            {notify ? (
              <Field data-invalid={phoneError ? "" : undefined}>
                <FieldLabel htmlFor="feedback-phone">Phone number</FieldLabel>
                <Input
                  id="feedback-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={phoneError ? true : undefined}
                />
                <FieldDescription>
                  {phoneError
                    ? "Enter a valid US number or full E.164 (e.g. +15551234567)."
                    : "US numbers only. Standard messaging rates may apply."}
                </FieldDescription>
              </Field>
            ) : null}
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
