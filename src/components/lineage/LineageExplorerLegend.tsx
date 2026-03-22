export function LineageExplorerLegend() {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Legend
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground">
          <span className="h-0.5 w-5 rounded-full bg-primary" />
          Brew Again lineage
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm text-foreground">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-primary" />
          Starter-source lineage
        </div>
      </div>
    </div>
  );
}
