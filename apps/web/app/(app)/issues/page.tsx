import { IssuesList } from "@/components/issues-list";
import { IssuesViewTabs } from "@/components/issues-view-tabs";

export default function AllIssuesPage() {
  return (
    <div className="flex flex-col">
      <header className="flex flex-col border-b">
        <div className="px-4 pt-3">
          <h1 className="text-lg font-semibold">All issues</h1>
          <p className="text-muted-foreground text-xs">
            Every issue, grouped by status
          </p>
        </div>
        <IssuesViewTabs active="all" />
      </header>
      <IssuesList />
    </div>
  );
}
