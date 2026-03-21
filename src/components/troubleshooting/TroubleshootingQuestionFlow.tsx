import type {
  TroubleshootingAnswerMap,
  TroubleshootingQuestionDefinition,
} from "@/lib/troubleshooting/types";
import { Button } from "@/components/ui/button";

type Props = {
  questions: TroubleshootingQuestionDefinition[];
  answers: TroubleshootingAnswerMap;
  onAnswerChange: (questionId: string, value: string | number | undefined) => void;
  onSubmit: () => void;
  submitDisabled: boolean;
};

export function TroubleshootingQuestionFlow({
  questions,
  answers,
  onAnswerChange,
  onSubmit,
  submitDisabled,
}: Props) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Guided questions
        </p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Answer a few quick checks</h2>
      </div>

      <div className="mt-4 space-y-5">
        {questions.map((question) => {
          const value = answers[question.id];

          return (
            <div key={question.id} className="space-y-2">
              <div>
                <label className="text-sm font-medium text-foreground">{question.label}</label>
                {question.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{question.description}</p>
                ) : null}
              </div>

              {question.input === "single_select" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {question.options?.map((option) => {
                    const isSelected = value === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onAnswerChange(question.id, option.value)}
                        className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                          isSelected
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-background hover:bg-muted"
                        }`}
                      >
                        <p className="text-sm font-medium text-foreground">{option.label}</p>
                        {option.description ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="max-w-xs">
                  <input
                    type="number"
                    min={question.min}
                    max={question.max}
                    step={question.step}
                    value={typeof value === "number" ? value : ""}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      onAnswerChange(
                        question.id,
                        nextValue === "" ? undefined : Number(nextValue)
                      );
                    }}
                    placeholder={question.placeholder}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {question.unitLabel ? (
                    <p className="mt-1 text-xs text-muted-foreground">{question.unitLabel}</p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onSubmit} disabled={submitDisabled}>
          See guidance
        </Button>
      </div>
    </div>
  );
}
