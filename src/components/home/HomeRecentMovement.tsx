import { Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { HomeRecentMovementItem } from "@/lib/home-command-center";

export function HomeRecentMovement({
  items,
  id,
}: {
  items: HomeRecentMovementItem[];
  id?: string;
}) {
  const navigate = useNavigate();

  return (
    <section id={id} className="home-panel-surface px-5 py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          Recent changes
        </p>
        <h2 className="mt-2 text-xl font-semibold text-foreground">
          What changed lately
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A quieter look at what changed across your brews.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(item.linkTo)}
            className="w-full rounded-[20px] border border-border/75 bg-background/85 px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                {new Date(item.eventAt).toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
