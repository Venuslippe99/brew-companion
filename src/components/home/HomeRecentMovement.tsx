import { Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { homeCopy } from "@/copy/home";
import type { HomeRecentActivityMiniItem } from "@/lib/home-command-center";

export function HomeRecentMovement({
  items,
  id,
}: {
  items: HomeRecentActivityMiniItem[];
  id?: string;
}) {
  const navigate = useNavigate();

  return (
    <section id={id} className="home-panel-surface px-5 py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {homeCopy.recentActivity.eyebrow}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-foreground">
          {homeCopy.recentActivity.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {homeCopy.recentActivity.description}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{homeCopy.recentActivity.empty}</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.linkTo)}
              className="w-full rounded-[18px] border border-border/70 bg-background/85 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                </div>
                <Clock3 className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
