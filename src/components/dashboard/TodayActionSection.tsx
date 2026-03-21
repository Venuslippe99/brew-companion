import { ScrollReveal } from "@/components/common/ScrollReveal";
import { TodayActionCard } from "@/components/dashboard/TodayActionCard";
import { type TodayActionSection as TodayActionSectionType } from "@/lib/today-actions";

export function TodayActionSection({
  section,
  delay = 0,
}: {
  section: TodayActionSectionType;
  delay?: number;
}) {
  return (
    <ScrollReveal delay={delay}>
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            {section.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
        </div>

        <div className="space-y-3">
          {section.items.map((item) => (
            <TodayActionCard key={item.batch.id} item={item} />
          ))}
        </div>
      </section>
    </ScrollReveal>
  );
}
