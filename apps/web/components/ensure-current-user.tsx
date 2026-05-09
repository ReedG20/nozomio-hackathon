"use client";

import * as React from "react";
import { useConvexAuth, useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";

export function EnsureCurrentUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensureCurrent = useMutation(api.users.ensureCurrent);
  const ranRef = React.useRef(false);

  React.useEffect(() => {
    if (!isAuthenticated || ranRef.current) return;
    ranRef.current = true;
    ensureCurrent().catch((err) => {
      console.error("Failed to ensure current user:", err);
      ranRef.current = false;
    });
  }, [isAuthenticated, ensureCurrent]);

  return null;
}
