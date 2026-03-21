import type { TroubleshootingIssueDefinition, TroubleshootingIssueId } from "@/lib/troubleshooting/types";

type Props = {
  issues: TroubleshootingIssueDefinition[];
  selectedIssueId?: TroubleshootingIssueId | null;
  onSelect: (issueId: TroubleshootingIssueId) => void;
};

export function TroubleshootingIssuePicker({
  issues,
  selectedIssueId,
  onSelect,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Troubleshooting issue
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">What are you noticing?</h2>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {issues.map((issue) => {
          const isSelected = issue.id === selectedIssueId;

          return (
            <button
              key={issue.id}
              type="button"
              onClick={() => onSelect(issue.id)}
              className={`rounded-xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              <p className="text-sm font-semibold text-foreground">{issue.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {issue.summary}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
