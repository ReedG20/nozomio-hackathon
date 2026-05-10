"use client";

import * as React from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

import { api } from "@/convex/_generated/api";

export function EnsureCurrentUser() {
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);

  const profileKey = user
    ? [user.id, user.email, user.firstName, user.lastName, user.profilePictureUrl].join("|")
    : null;
  const lastSyncedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated || !user || profileKey === null) return;
    if (lastSyncedRef.current === profileKey) return;
    lastSyncedRef.current = profileKey;
    ensureCurrent({
      profile: {
        email: user.email,
        firstName: user.firstName ?? null,
        lastName: user.lastName ?? null,
        profilePictureUrl: user.profilePictureUrl ?? null,
      },
    }).catch((err) => {
      console.error("Failed to ensure current user:", err);
      lastSyncedRef.current = null;
    });
  }, [isAuthenticated, profileKey, user, ensureCurrent]);

  return null;
}
