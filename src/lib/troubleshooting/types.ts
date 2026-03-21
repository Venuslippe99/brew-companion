import type { BatchTimingResult } from "@/lib/batch-timing";
import type { KombuchaBatch } from "@/lib/batches";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";

export type TroubleshootingIssueId =
  | "too_sour"
  | "too_sweet_or_not_fermenting"
  | "no_carbonation"
  | "too_much_carbonation"
  | "not_sure_if_ready"
  | "strange_strands_or_sediment"
  | "mold_concern";

export type TroubleshootingSeverity =
  | "likely_normal"
  | "monitor_check_soon"
  | "caution"
  | "urgent_action"
  | "discard_unsafe";

export type TroubleshootingAnswerValue = string | number;

export type TroubleshootingAnswerMap = Record<string, TroubleshootingAnswerValue | undefined>;

export type TroubleshootingQuestionOption = {
  value: string;
  label: string;
  description?: string;
};

export type TroubleshootingQuestionDefinition = {
  id: string;
  label: string;
  description?: string;
  input: "single_select" | "number";
  options?: TroubleshootingQuestionOption[];
  placeholder?: string;
  unitLabel?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  shouldShow?: (context: TroubleshootingQuestionContext) => boolean;
};

export type TroubleshootingQuestionContext = {
  issueId: TroubleshootingIssueId;
  batch?: KombuchaBatch | null;
  timing?: BatchTimingResult | null;
  f2Setup?: LoadedF2Setup | null;
  answers: TroubleshootingAnswerMap;
};

export type TroubleshootingRelatedAction = {
  label: string;
  href?: string;
};

export type TroubleshootingResult = {
  headline: string;
  severity: TroubleshootingSeverity;
  interpretation: string;
  whyTheAppThinksThis: string[];
  immediateAction: string;
  nextCheck: string;
  relatedBatchAction?: TroubleshootingRelatedAction;
  uncertaintyNote: string;
  escalationNote?: string;
};

export type TroubleshootingIssueDefinition = {
  id: TroubleshootingIssueId;
  title: string;
  shortLabel: string;
  summary: string;
  getQuestions: (
    context: TroubleshootingQuestionContext
  ) => TroubleshootingQuestionDefinition[];
};

export type TroubleshootingReminderContext = {
  id: string;
  title: string;
  dueAt: string;
  urgencyLevel: "low" | "medium" | "high" | "overdue";
  reminderType?: string | null;
};

export type TroubleshootingBatchContext = {
  batch?: KombuchaBatch | null;
  timing?: BatchTimingResult | null;
  f2Setup?: LoadedF2Setup | null;
  nearestReminder?: TroubleshootingReminderContext | null;
};

export type TroubleshootingEvaluationContext = TroubleshootingBatchContext & {
  issueId: TroubleshootingIssueId;
  answers: TroubleshootingAnswerMap;
};
