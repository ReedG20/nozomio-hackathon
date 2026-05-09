import {
  AlertCircleIcon,
  Tick02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Loading03Icon,
  CircleArrowUp02Icon,
  ArrowRight01Icon,
  ArrowDown02Icon,
  RemoveCircleIcon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";

export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "done"
  | "cancelled";

export type IssuePriority = "none" | "urgent" | "high" | "medium" | "low";

export const STATUS_ORDER: IssueStatus[] = [
  "in_progress",
  "todo",
  "backlog",
  "done",
  "cancelled",
];

export const PRIORITY_ORDER: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

export const statusMeta: Record<
  IssueStatus,
  { label: string; icon: IconSvgElement; tone: string }
> = {
  backlog: {
    label: "Backlog",
    icon: HelpCircleIcon,
    tone: "text-muted-foreground",
  },
  todo: {
    label: "Todo",
    icon: Tick02Icon,
    tone: "text-muted-foreground",
  },
  in_progress: {
    label: "In Progress",
    icon: Loading03Icon,
    tone: "text-amber-500",
  },
  done: {
    label: "Done",
    icon: CheckmarkCircle02Icon,
    tone: "text-emerald-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: Cancel01Icon,
    tone: "text-muted-foreground",
  },
};

export const priorityMeta: Record<
  IssuePriority,
  { label: string; icon: IconSvgElement; tone: string }
> = {
  none: {
    label: "No priority",
    icon: RemoveCircleIcon,
    tone: "text-muted-foreground",
  },
  urgent: {
    label: "Urgent",
    icon: AlertCircleIcon,
    tone: "text-red-500",
  },
  high: {
    label: "High",
    icon: CircleArrowUp02Icon,
    tone: "text-orange-500",
  },
  medium: {
    label: "Medium",
    icon: ArrowRight01Icon,
    tone: "text-yellow-600",
  },
  low: {
    label: "Low",
    icon: ArrowDown02Icon,
    tone: "text-muted-foreground",
  },
};
