export type BatchTimingInput = {
  brew_started_at?: string | null;
  current_stage?: string | null;
  avg_room_temp_c?: number | null;
  target_preference?: string | null;
  starter_liquid_ml?: number | null;
  total_volume_ml?: number | null;
};

export type BatchTimingStatus = "too_early" | "approaching" | "ready" | "overdue";

export type BatchTimingResult = {
  stageKey: "f1_active";
  stageLabel: "F1";
  elapsedDays: number;
  estimatedReadyDay: number;
  windowStartDay: number;
  windowEndDay: number;
  windowDateRangeText: string;
  status: BatchTimingStatus;
  statusLabel: string;
  guidance: string;
  nextActionLabel: string;
  nextCheckText: string;
  explanation: string;
};

const DAY_MS = 1000 * 60 * 60 * 24;

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

const F1_TIMING_STAGES = new Set([
  "f1_active",
  "f1_check_window",
  "f1_extended",
]);

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatShortDate(date: Date) {
  return shortDateFormatter.format(date);
}

function getElapsedDays(startIso: string, now = new Date()) {
  const start = new Date(startIso);

  const diffMs = stripTime(now).getTime() - stripTime(start).getTime();
  const diffDays = Math.floor(diffMs / DAY_MS);

  // Brew day counts as Day 1
  return Math.max(1, diffDays + 1);
}

function getTemperatureAdjustment(tempC?: number | null) {
  if (tempC == null) return 0;
  if (tempC <= 18) return 4;
  if (tempC <= 20) return 2;
  if (tempC <= 22) return 1;
  if (tempC <= 24) return 0;
  if (tempC <= 26) return -1;
  return -2;
}

function getPreferenceAdjustment(targetPreference?: string | null) {
  if (targetPreference === "sweeter") return -1;
  if (targetPreference === "tart") return 2;
  return 0;
}

function getStarterAdjustment(starterLiquidMl?: number | null, totalVolumeMl?: number | null) {
  if (!starterLiquidMl || !totalVolumeMl || totalVolumeMl <= 0) return 0;

  const ratio = starterLiquidMl / totalVolumeMl;

  if (ratio > 0.15) return -1;
  if (ratio < 0.1) return 1;

  return 0;
}

function buildExplanation(batch: BatchTimingInput) {
  const parts: string[] = [];

  if (batch.avg_room_temp_c != null) {
    parts.push(`${batch.avg_room_temp_c}°C room temperature`);
  }

  if (batch.target_preference) {
    parts.push(`${batch.target_preference} taste target`);
  }

  if (batch.starter_liquid_ml && batch.total_volume_ml) {
    const ratio = Math.round((batch.starter_liquid_ml / batch.total_volume_ml) * 100);
    parts.push(`${ratio}% starter ratio`);
  }

  if (parts.length === 0) {
    return "Based on your brew date and a default F1 estimate.";
  }

  return `Based on your brew date, ${parts.join(", ")}.`;
}

export function getBatchStageTiming(
  batch: BatchTimingInput,
  now = new Date()
): BatchTimingResult | null {
  if (!batch.brew_started_at) return null;

  if (batch.current_stage && !F1_TIMING_STAGES.has(batch.current_stage)) {
    return null;
  }

  const elapsedDays = getElapsedDays(batch.brew_started_at, now);
  const isExtendedF1 = batch.current_stage === "f1_extended";

  const baseReadyDay = 7;
  const temperatureAdjustment = getTemperatureAdjustment(batch.avg_room_temp_c);
  const preferenceAdjustment = getPreferenceAdjustment(batch.target_preference);
  const starterAdjustment = getStarterAdjustment(
    batch.starter_liquid_ml,
    batch.total_volume_ml
  );

  const estimatedReadyDay = Math.max(
    3,
    baseReadyDay + temperatureAdjustment + preferenceAdjustment + starterAdjustment
  );

  const windowStartDay = Math.max(3, estimatedReadyDay - 1);
  const windowEndDay = estimatedReadyDay + 2;

  let status: BatchTimingStatus;
  let statusLabel: string;
  let guidance: string;
  let nextActionLabel: string;
  let nextCheckText: string;

  if (elapsedDays < windowStartDay - 1) {
    const daysUntilWindow = windowStartDay - elapsedDays;
    status = "too_early";
    statusLabel = "Too early for first tasting";
    guidance = "Fermentation is still early. No tasting needed yet.";
    nextActionLabel = "Let it ferment";
    nextCheckText = `Taste in ${daysUntilWindow} day${daysUntilWindow === 1 ? "" : "s"}`;
  } else if (elapsedDays < windowStartDay) {
    status = "approaching";
    statusLabel = "Approaching tasting window";
    guidance = "Your batch is nearing its first tasting window.";
    nextActionLabel = "Taste from tomorrow";
    nextCheckText = "Taste tomorrow";
  } else if (elapsedDays <= windowEndDay) {
    status = "ready";
    statusLabel = isExtendedF1 ? "Still fermenting, taste again" : "Ready to taste";
    guidance = isExtendedF1
      ? "You chose to keep fermenting. Taste again today and move to F2 when it is ready."
      : "This is a good time to taste and decide whether to continue F1 or start F2.";
    nextActionLabel = "Taste today";
    nextCheckText = "Taste today";
  } else {
    status = "overdue";
    statusLabel = isExtendedF1 ? "Extended F1, check again now" : "Past expected F1 window";
    guidance = isExtendedF1
      ? "This batch is still in F1 beyond the first window. Taste again now and move to F2 once it is ready."
      : "Your batch is past its expected F1 window. Taste now and move to F2 if ready.";
    nextActionLabel = "Taste now";
    nextCheckText = "Check flavour now";
  }

  const brewStartDate = stripTime(new Date(batch.brew_started_at));
  const windowStartDate = addDays(brewStartDate, windowStartDay - 1);
  const windowEndDate = addDays(brewStartDate, windowEndDay - 1);

  return {
    stageKey: "f1_active",
    stageLabel: "F1",
    elapsedDays,
    estimatedReadyDay,
    windowStartDay,
    windowEndDay,
    windowDateRangeText: `${formatShortDate(windowStartDate)}–${formatShortDate(windowEndDate)}`,
    status,
    statusLabel,
    guidance,
    nextActionLabel,
    nextCheckText,
    explanation: buildExplanation(batch),
  };
}
