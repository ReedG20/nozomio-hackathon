import { IssuesList } from "@/components/issues-list";

export default function InboxPage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Inbox</h1>
          <p className="text-muted-foreground text-xs">
            All issues in your workspace
          </p>
        </div>
      </div>
      <IssuesList />
    </div>
  );
}
