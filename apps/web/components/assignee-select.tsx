"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick02Icon,
  UnfoldMoreIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";

export type AssigneeValue = Id<"users"> | null;

function displayName(user: Pick<Doc<"users">, "name" | "email">) {
  if (user.name && user.name.trim().length > 0) return user.name;
  if (user.email && user.email.trim().length > 0) return user.email;
  return "Unknown user";
}

function initialsFor(user: Pick<Doc<"users">, "name" | "email">) {
  const source = displayName(user);
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<Doc<"users">, "name" | "email" | "pictureUrl"> | null | undefined;
  className?: string;
}) {
  if (!user) {
    return (
      <span
        className={cn(
          "bg-muted text-muted-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full",
          className,
        )}
      >
        <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
      </span>
    );
  }
  return (
    <Avatar className={cn("size-5 shrink-0", className)}>
      {user.pictureUrl ? (
        <AvatarImage src={user.pictureUrl} alt={displayName(user)} />
      ) : null}
      <AvatarFallback className="text-[10px] font-medium">
        {initialsFor(user)}
      </AvatarFallback>
    </Avatar>
  );
}

export function AssigneeSelect({
  value,
  onChange,
  className,
  disabled,
}: {
  value: AssigneeValue;
  onChange: (value: AssigneeValue) => void;
  className?: string;
  disabled?: boolean;
}) {
  const users = useQuery(api.users.list) ?? [];
  const selected = React.useMemo(
    () => users.find((u) => u._id === value) ?? null,
    [users, value],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between gap-2 rounded-3xl border-transparent bg-input/50 px-3 font-normal hover:bg-input/70",
            className,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <UserAvatar user={selected} />
            <span className="truncate">
              {selected ? displayName(selected) : "Unassigned"}
            </span>
          </span>
          <HugeiconsIcon
            icon={UnfoldMoreIcon}
            className="text-muted-foreground size-4 shrink-0"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 w-(--radix-dropdown-menu-trigger-width) min-w-56 overflow-y-auto"
      >
        <AssigneeOption
          selected={value === null}
          onSelect={() => onChange(null)}
          icon={
            <span className="bg-muted text-muted-foreground inline-flex size-5 shrink-0 items-center justify-center rounded-full">
              <HugeiconsIcon icon={UserCircleIcon} className="size-3.5" />
            </span>
          }
          label="Unassigned"
        />
        {users.map((u) => (
          <AssigneeOption
            key={u._id}
            selected={u._id === value}
            onSelect={() => onChange(u._id)}
            icon={<UserAvatar user={u} />}
            label={displayName(u)}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AssigneeOption({
  selected,
  onSelect,
  icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        onSelect();
      }}
      className="pr-8"
    >
      {icon}
      <span className="truncate">{label}</span>
      {selected ? (
        <HugeiconsIcon
          icon={Tick02Icon}
          strokeWidth={2}
          className="text-muted-foreground absolute right-3 size-4"
        />
      ) : null}
    </DropdownMenuItem>
  );
}
