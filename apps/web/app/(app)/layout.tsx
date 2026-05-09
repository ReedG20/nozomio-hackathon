import { withAuth } from "@workos-inc/authkit-nextjs";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import { EnsureCurrentUser } from "@/components/ensure-current-user";
import { FeedbackButton } from "@/components/feedback-button";
import { NewIssueDialogProvider } from "@/components/new-issue-dialog";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await withAuth({ ensureSignedIn: true });

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    null;

  const sidebarUser = {
    name: fullName,
    email: user.email,
    pictureUrl: user.profilePictureUrl ?? null,
  };

  return (
    <NewIssueDialogProvider>
      <EnsureCurrentUser />
      <SidebarProvider>
        <AppSidebar user={sidebarUser} />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-12 shrink-0 items-stretch gap-2 border-b px-3">
            <div className="flex items-center">
              <SidebarTrigger />
            </div>
            <div className="flex min-w-0 flex-1 items-center border-l border-border pl-3">
              <span className="text-muted-foreground text-sm font-medium">
                Workspace
              </span>
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
          <FeedbackButton />
        </SidebarInset>
      </SidebarProvider>
    </NewIssueDialogProvider>
  );
}
