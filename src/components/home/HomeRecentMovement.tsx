import { Clock3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { homeCopy } from "@/copy/home";
import type { HomeRecentActivityMiniItem } from "@/lib/home-command-center";

export function HomeRecentMovement({
  items,
}: {
  items: HomeRecentActivityMiniItem[];
}) {
  const navigate = useNavigate();

  return (
    <section className="home-panel-surface px-4 py-4 sm:px-5 sm:py-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-copper/80">
          {homeCopy.recentActivity.eyebrow}
        </p>
        <h2 className="mt-2 text-base font-semibold text-foreground">
          {homeCopy.recentActivity.title}
        </h2>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{homeCopy.recentActivity.empty}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.linkTo)}
              className="flex w-full items-start gap-3 rounded-[16px] border border-border/70 bg-background/85 px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5"
            >
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
