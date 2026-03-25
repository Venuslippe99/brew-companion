import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { homeCopy } from "@/copy/home";
import type { HomeAttentionItem } from "@/lib/home-command-center";
import { cn } from "@/lib/utils";

const toneClasses = {
  urgent: "border-destructive/15",
  warm: "border-primary/15",
  calm: "border-border/70",
};

export function HomeBatchRoster({
  items,
  id,
}: {
  items: HomeAttentionItem[];
  id?: string;
}) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return null;
  }

  return (
    <section id={id} className="home-panel-surface px-5 py-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
            {homeCopy.attention.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground">
            {homeCopy.attention.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {homeCopy.attention.description}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <button
            key={item.batch.id}
            type="button"
            onClick={() => navigate(item.linkTo)}
            className={cn(
              "w-full rounded-[20px] border bg-background/85 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5",
              toneClasses[item.tone]
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{item.batch.name}</h3>
                <p className="mt-2 text-sm font-medium text-foreground">{item.statusSummary}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.secondarySummary}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
