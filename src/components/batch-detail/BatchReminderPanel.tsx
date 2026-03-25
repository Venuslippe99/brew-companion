import { Button } from "@/components/ui/button";
import { batchDetailCopy } from "@/copy/batch-detail";
import {
  formatReminderDueText,
  getReminderTone,
  type BatchReminder,
} from "@/lib/batch-detail-view";

export function BatchReminderPanel({
  reminders,
  onCompleteReminder,
}: {
  reminders: BatchReminder[];
  onCompleteReminder: (reminderId: string) => void;
}) {
  if (reminders.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          {batchDetailCopy.reminders.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {batchDetailCopy.reminders.description}
        </p>
      </div>

      <div className="space-y-3">
        {reminders.map((reminder) => {
          const tone = getReminderTone(reminder.urgencyLevel);

          return (
            <div
              key={reminder.id}
              className={`rounded-2xl border p-4 ${tone.card}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${tone.pill}`}>
                      {tone.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {batchDetailCopy.reminders.duePrefix} {formatReminderDueText(reminder.dueAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {reminder.title}
                  </p>
                  {reminder.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {reminder.description}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCompleteReminder(reminder.id)}
                >
                  {batchDetailCopy.reminders.markDone}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
