import { IssuesList } from "@/components/issues-list";

export default function AllIssuesPage() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">All issues</h1>
          <p className="text-muted-foreground text-xs">
            Every issue, grouped by status
          </p>
        </div>
      </div>
      <IssuesList />
    </div>
  );
}
