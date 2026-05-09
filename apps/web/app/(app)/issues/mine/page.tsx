import { IssuesList } from "@/components/issues-list";
import { IssuesViewTabs } from "@/components/issues-view-tabs";

export default function MyIssuesPage() {
  return (
    <div className="flex flex-col">
      <header className="flex flex-col border-b">
        <div className="px-4 pt-3">
          <h1 className="text-lg font-semibold">My issues</h1>
          <p className="text-muted-foreground text-xs">
            Issues assigned to you
          </p>
        </div>
        <IssuesViewTabs active="mine" />
      </header>
      <IssuesList
        filter="mine"
        emptyTitle="Nothing assigned to you"
        emptyDescription="Issues assigned to you will show up here."
      />
    </div>
  );
}
