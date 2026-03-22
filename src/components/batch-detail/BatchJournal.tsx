import { ScrollReveal } from "@/components/common/ScrollReveal";
import type { BatchJournalSection } from "@/lib/batch-journal";
import { BatchJournalEntry } from "@/components/batch-detail/BatchJournalEntry";

export function BatchJournal({
  sections,
}: {
  sections: BatchJournalSection[];
}) {
  if (sections.length === 0) {
    return (
      <ScrollReveal>
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Journal
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This brewing journal is still quiet. Stage changes, checks, and reflections will appear here as the batch moves forward.
          </p>
        </div>
      </ScrollReveal>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <ScrollReveal key={section.chapter} delay={sectionIndex * 0.04}>
          <section className="space-y-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>

            <div className="space-y-5">
              {section.groups.map((group) => (
                <div key={`${section.chapter}-${group.dateLabel}`} className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.dateLabel}
                  </p>
                  <div className="space-y-3">
                    {group.entries.map((entry) => (
                      <BatchJournalEntry key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </ScrollReveal>
      ))}
    </div>
  );
}
