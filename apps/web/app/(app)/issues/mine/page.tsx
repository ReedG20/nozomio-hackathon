import { IssuesList } from "@/components/issues-list";

export default function MyIssuesPage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">My issues</h1>
          <p className="text-muted-foreground text-xs">
            Issues assigned to you
          </p>
        </div>
      </div>
      <IssuesList
        filter="mine"
        emptyTitle="Nothing assigned to you"
        emptyDescription="Issues assigned to you will show up here."
      />
    </div>
  );
}
