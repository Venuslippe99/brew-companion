import type {
  TroubleshootingEvaluationContext,
  TroubleshootingIssueId,
  TroubleshootingResult,
  TroubleshootingSeverity,
} from "@/lib/troubleshooting/types";

function getTextAnswer(context: TroubleshootingEvaluationContext, key: string) {
  const value = context.answers[key];
  return typeof value === "string" ? value : undefined;
}

function getNumberAnswer(context: TroubleshootingEvaluationContext, key: string) {
  const value = context.answers[key];
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

function inferStage(context: TroubleshootingEvaluationContext) {
  if (context.batch) {
    switch (context.batch.currentStage) {
      case "f2_setup":
      case "f2_active":
        return "f2";
      case "refrigerate_now":
      case "chilled_ready":
      case "completed":
        return "refrigerated";
      default:
        return "f1";
    }
  }

  return getTextAnswer(context, "stage");
}

function getElapsedDays(context: TroubleshootingEvaluationContext) {
  return context.timing?.elapsedDays ?? getNumberAnswer(context, "days_elapsed");
}

function hasMoldConcern(context: TroubleshootingEvaluationContext) {
  return (
    getTextAnswer(context, "visible_mold_concern") === "yes" ||
    getTextAnswer(context, "texture") === "fuzzy" ||
    getTextAnswer(context, "surface_texture") === "yes" ||
    getTextAnswer(context, "smooth_or_fuzzy") === "dry_fuzzy_spots" ||
    getTextAnswer(context, "surface_color") === "green_blue_black" ||
    getTextAnswer(context, "color") === "unusual_color"
  );
}

function hasRottenSmell(context: TroubleshootingEvaluationContext) {
  return getTextAnswer(context, "smell") === "rotten_off";
}

function inferF2Additions(context: TroubleshootingEvaluationContext) {
  const answer = getTextAnswer(context, "f2_additions");
  if (answer) return answer;

  if (!context.f2Setup) return undefined;

  const hasIngredients = context.f2Setup.bottles.some((bottle) => bottle.ingredients.length > 0);
  return hasIngredients ? "yes" : "no";
}

function buildRelatedAction(context: TroubleshootingEvaluationContext) {
  if (!context.batch) return undefined;

  if (context.nearestReminder?.title) {
    return {
      label: context.nearestReminder.title,
      href: `/batch/${context.batch.id}`,
    };
  }

  return {
    label: context.batch.nextAction || "Open batch detail",
    href: `/batch/${context.batch.id}`,
  };
}

function buildUncertaintyNote(context: TroubleshootingEvaluationContext, extra?: string) {
  const parts = [
    context.batch
      ? "This uses your saved batch stage, timing, and any attached F2 setup."
      : "This is based only on the answers you entered here.",
  ];

  if (getNumberAnswer(context, "measured_ph") == null) {
    parts.push("Without a measured pH, the app cannot confirm how acidic the batch is.");
  }

  if (extra) {
    parts.push(extra);
  }

  return parts.join(" ");
}

function buildResult(
  context: TroubleshootingEvaluationContext,
  result: Omit<TroubleshootingResult, "relatedBatchAction" | "uncertaintyNote"> & {
    uncertaintyExtra?: string;
  }
): TroubleshootingResult {
  return {
    ...result,
    relatedBatchAction: buildRelatedAction(context),
    uncertaintyNote: buildUncertaintyNote(context, result.uncertaintyExtra),
  };
}

function evaluateTooSour(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const stage = inferStage(context);
  const measuredPh = getNumberAnswer(context, "measured_ph");
  const sournessLevel = getTextAnswer(context, "sourness_level");

  if (hasMoldConcern(context) || hasRottenSmell(context)) {
    return buildResult(context, {
      headline: "This looks more concerning than simple over-fermentation",
      severity: "discard_unsafe",
      interpretation:
        "Sourness by itself is often a quality issue, but sourness paired with fuzzy growth or a rotten smell is not something the app should treat as a normal kombucha result.",
      whyTheAppThinksThis: [
        "You reported either visible mold concern or a rotten/off smell.",
        "That combination is more serious than a batch that is merely sharper than you wanted.",
      ],
      immediateAction: "Do not consume it, do not reuse the culture, and discard the batch.",
      nextCheck: "If you want to review what happened, open the batch detail page and compare the timing and notes there.",
      escalationNote: "If fuzzy or unusually colored surface growth is present, treat this as a discard state.",
    });
  }

  if (measuredPh != null && measuredPh < 2.5) {
    return buildResult(context, {
      headline: "This batch may now be too acidic for normal drinking guidance",
      severity: "caution",
      interpretation:
        "This still sounds more like over-fermentation than contamination, but a measured pH below 2.5 is lower than the app should treat as a normal finished drinking range.",
      whyTheAppThinksThis: [
        `You entered a measured pH of ${measuredPh.toFixed(1)}.`,
        "The batch does not also show the stronger mold or spoilage signs that would push this into discard guidance.",
      ],
      immediateAction:
        stage === "refrigerated"
          ? "Keep it chilled and avoid treating it like a normal ready-to-drink batch."
          : "Chill it now rather than leaving it at room temperature.",
      nextCheck: "Use it as a strong starter or review whether you want to keep or discard it based on smell and appearance.",
      escalationNote: "If any spoilage sign appears in addition to the acidity, stop and discard it.",
    });
  }

  return buildResult(context, {
    headline:
      sournessLevel === "sharp_vinegar_like"
        ? "This batch is likely over-fermented"
        : "This is often just more sour than you wanted",
    severity: "likely_normal",
    interpretation:
      "Too sour kombucha is usually a timing or preference issue, not a contamination signal by itself, when the batch still smells normal and shows no fuzzy growth.",
    whyTheAppThinksThis: [
      context.timing
        ? `The batch timing is already in the ${context.timing.statusLabel.toLowerCase()} range.`
        : "There are no stronger warning signs in your answers.",
      "You did not report a rotten smell or a visible mold concern.",
    ],
    immediateAction:
      stage === "refrigerated"
        ? "Keep it chilled and decide whether to drink, dilute, or reuse it as starter."
        : "Chill it now if the flavour is already sharper than you want.",
    nextCheck: "Adjust your next batch to taste a little earlier if you want more sweetness.",
    uncertaintyExtra:
      "Taste preference varies a lot, so the app is treating this as likely normal only because no stronger spoilage cues were reported.",
  });
}

function evaluateTooSweet(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const measuredPh = getNumberAnswer(context, "measured_ph");
  const elapsedDays = getElapsedDays(context);

  if (hasMoldConcern(context) || hasRottenSmell(context)) {
    return buildResult(context, {
      headline: "Sweetness plus spoilage signs is more concerning",
      severity: "discard_unsafe",
      interpretation:
        "A batch that still tastes sweet is not automatically unsafe, but sweetness paired with visible mold concern or a rotten smell should not be treated as normal fermentation.",
      whyTheAppThinksThis: [
        "You reported either fuzzy/colored growth concern or a rotten/off smell.",
        "Those are stronger warning signs than slow fermentation alone.",
      ],
      immediateAction: "Do not drink it and do not reuse the culture.",
      nextCheck: "Discard the batch and review the guide content before restarting.",
      escalationNote: "If the surface growth is fuzzy or dry, err on the side of discard.",
    });
  }

  if (measuredPh != null && elapsedDays != null && elapsedDays >= 10 && measuredPh > 4.2) {
    return buildResult(context, {
      headline: "This batch has stayed above the usual acidity target for too long",
      severity: "discard_unsafe",
      interpretation:
        "A measured pH above 4.2 by about day 10 is not something the app should treat as a normal or safe fermentation path.",
      whyTheAppThinksThis: [
        `You entered about day ${elapsedDays}.`,
        `You also entered a measured pH of ${measuredPh.toFixed(1)}.`,
      ],
      immediateAction: "Discard the batch and restart rather than trying to push it further.",
      nextCheck: "Review starter strength, room temperature, and inoculation on the next batch.",
      escalationNote: "This discard guidance depends on the measured pH you entered.",
    });
  }

  if (measuredPh != null && elapsedDays != null && elapsedDays >= 7 && measuredPh > 4.2) {
    return buildResult(context, {
      headline: "This batch may need a closer acidity check",
      severity: "caution",
      interpretation:
        "The batch may simply be moving slowly, but a measured pH still above 4.2 around day 7 calls for caution rather than blind waiting.",
      whyTheAppThinksThis: [
        `You entered about day ${elapsedDays}.`,
        `You also entered a measured pH of ${measuredPh.toFixed(1)}.`,
      ],
      immediateAction: "Keep observing carefully and re-check soon rather than assuming it is ready.",
      nextCheck: "If the pH still has not reached 4.2 or lower by around day 10, discard and restart.",
      escalationNote: "If you also start seeing mold or smelling spoilage, stop earlier.",
    });
  }

  if (
    context.timing?.status === "too_early" ||
    context.timing?.status === "approaching" ||
    (elapsedDays != null && elapsedDays < 7)
  ) {
    return buildResult(context, {
      headline: "This may still be early rather than failed",
      severity: "monitor_check_soon",
      interpretation:
        "A batch that still tastes sweet often just needs more time, especially when fermentation is still early and there are no stronger warning signs.",
      whyTheAppThinksThis: [
        context.timing
          ? `The timing helper still places it in the ${context.timing.statusLabel.toLowerCase()} range.`
          : `You entered about day ${elapsedDays}.`,
        "You did not report the stronger spoilage cues that would change the safety guidance.",
      ],
      immediateAction: "Let it keep fermenting and check again soon.",
      nextCheck: "Taste again later and use pH if you want a firmer safety check.",
    });
  }

  return buildResult(context, {
    headline: "This batch seems slower than expected",
    severity: "caution",
    interpretation:
      "It may still be a slow fermentation rather than a failed one, but it no longer sounds like a clearly early batch.",
    whyTheAppThinksThis: [
      elapsedDays != null ? `You entered about day ${elapsedDays}.` : "The batch is past the earliest stage window.",
      "There are no clear mold signals, but the sweetness has lasted longer than the app would treat as obviously early.",
    ],
    immediateAction: "Keep observing cautiously and check pH if you can.",
    nextCheck: "If measured pH is still above 4.2 by around day 10, discard and restart.",
  });
}

function evaluateNoCarbonation(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const alreadyRefrigerated = getTextAnswer(context, "already_refrigerated") === "yes";
  const sealedNow = getTextAnswer(context, "sealed_now") === "yes";
  const sealConfidence = getTextAnswer(context, "seal_confidence");
  const f2Additions = inferF2Additions(context);

  if (getTextAnswer(context, "looks_smells_normal") === "no") {
    return buildResult(context, {
      headline: "Flatness plus another warning sign needs a closer check",
      severity: "caution",
      interpretation:
        "Very flat kombucha is usually a process issue, but if the batch also seems abnormal in smell or appearance the app should not call it simply harmless.",
      whyTheAppThinksThis: [
        "You reported that the batch does not otherwise look and smell normal.",
        "That means the assistant should separate flatness from broader safety concerns.",
      ],
      immediateAction: "Pause before drinking and inspect the batch carefully.",
      nextCheck: "Open the batch detail page and compare timing, notes, and any visual concerns.",
    });
  }

  if (!sealedNow) {
    return buildResult(context, {
      headline: "This likely has not had the setup needed to build pressure",
      severity: "likely_normal",
      interpretation:
        "If the batch is not sealed, very low carbonation is not surprising and does not point to a safety problem by itself.",
      whyTheAppThinksThis: ["You said it is not bottled and sealed right now."],
      immediateAction: "Treat this as a process issue rather than a safety issue.",
      nextCheck: "Review your F2 setup or bottling step before expecting carbonation.",
    });
  }

  if (alreadyRefrigerated || context.timing?.status === "too_early") {
    return buildResult(context, {
      headline: "This flatness is still within a normal process range",
      severity: "likely_normal",
      interpretation:
        "Very flat kombucha often just means the bottles were chilled early, the F2 window is still young, or the setup is not yet ideal for pressure build.",
      whyTheAppThinksThis: [
        alreadyRefrigerated
          ? "You said the bottles are already refrigerated, which slows further carbonation."
          : `The timing helper still places F2 in the ${context.timing?.statusLabel.toLowerCase()} range.`,
      ],
      immediateAction: alreadyRefrigerated ? "Keep it chilled if safety is the main concern." : "Give it more time before assuming something went wrong.",
      nextCheck: "Re-check carbonation later, or adjust future F2 timing and sugar additions.",
    });
  }

  return buildResult(context, {
    headline: "This is most likely a process issue, not a safety issue",
    severity: "monitor_check_soon",
    interpretation:
      "No carbonation usually points to F2 setup, sealing, sugar, or timing rather than contamination by itself.",
    whyTheAppThinksThis: [
      sealConfidence === "no"
        ? "You said the bottles may not be sealing well."
        : f2Additions === "no"
          ? "You reported no obvious fermentable additions in F2."
          : "There are no stronger spoilage signs in your answers.",
    ],
    immediateAction: "Keep observing rather than treating flatness as automatically unsafe.",
    nextCheck: "Review bottle seal, sugar additions, temperature, and time in F2.",
  });
}

function evaluateTooMuchCarbonation(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const pressureState = getTextAnswer(context, "pressure_state");
  const alreadyRefrigerated = getTextAnswer(context, "already_refrigerated") === "yes";

  if (pressureState === "hard_or_bulging" || pressureState === "leaking_or_spraying") {
    return buildResult(context, {
      headline: "Treat this as an urgent pressure issue",
      severity: "urgent_action",
      interpretation:
        "This sounds more serious than normal carbonation because the bottles may already be under hazardous pressure.",
      whyTheAppThinksThis: [
        pressureState === "hard_or_bulging"
          ? "You described the bottles as very hard or bulging."
          : "You described leaking or spraying behavior.",
        context.timing?.status === "overdue"
          ? "The timing helper also places the batch past its expected F2 window."
          : "Sealed warm F2 bottles can build pressure quickly.",
      ],
      immediateAction: alreadyRefrigerated
        ? "Keep the bottles cold and open very carefully over a sink."
        : "Refrigerate the bottles now and open them very carefully over a sink once cold.",
      nextCheck: "Handle one bottle at a time and avoid shaking or warming them further.",
      escalationNote: "If bottles are bulging, leaking, or gushing hard, prioritize pressure safety over experimentation.",
    });
  }

  return buildResult(context, {
    headline: "This needs cautious pressure handling",
    severity: "caution",
    interpretation:
      "High carbonation is riskier than flatness because sealed bottles can keep building pressure at room temperature.",
    whyTheAppThinksThis: [
      inferF2Additions(context) === "yes"
        ? "You reported sugar-rich additions in F2, which can drive more pressure."
        : "You are troubleshooting a sealed F2 carbonation concern.",
      context.timing?.status === "overdue"
        ? "The timing helper already places it past the expected F2 window."
        : "The safest next step is still to slow fermentation down.",
    ],
    immediateAction: alreadyRefrigerated
      ? "Keep the bottles chilled and open one carefully when you are ready to check them."
      : "Refrigerate the bottles now to slow further pressure build.",
    nextCheck: "Once cold, test one bottle carefully instead of leaving them warm longer.",
    escalationNote: "If bottles become very hard, bulge, leak, or gush hard, move into urgent-action handling.",
  });
}

function evaluateNotSureIfReady(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const stage = inferStage(context);
  const tasteImpression = getTextAnswer(context, "taste_impression");
  const measuredPh = getNumberAnswer(context, "measured_ph");

  if (context.timing?.stageKey === "f2_active" && context.timing.status === "overdue") {
    return buildResult(context, {
      headline: "This batch should be chilled now",
      severity: "caution",
      interpretation:
        "The batch sounds past the expected warm F2 window, so the safest readiness move is to refrigerate rather than keep waiting at room temperature.",
      whyTheAppThinksThis: [
        `The timing helper marks F2 as ${context.timing.statusLabel.toLowerCase()}.`,
        "Warm sealed bottles can continue building pressure if left longer.",
      ],
      immediateAction: "Move the bottles to the refrigerator now.",
      nextCheck: "Once cold, open one bottle carefully and reassess the carbonation level.",
      escalationNote: "If bottles already feel very hard or are leaking, treat it as a pressure issue instead.",
    });
  }

  if (
    (context.timing?.status === "ready" && tasteImpression === "balanced_tang") ||
    (stage === "f2" && tasteImpression === "carbonation_right")
  ) {
    return buildResult(context, {
      headline: "This likely is in a good readiness window",
      severity: "likely_normal",
      interpretation:
        "The current timing and your taste impression are lining up, so this sounds more like a normal readiness decision than a problem.",
      whyTheAppThinksThis: [
        context.timing
          ? `The timing helper currently says ${context.timing.statusLabel.toLowerCase()}.`
          : "Your taste impression matches a likely ready state.",
        stage === "f2"
          ? "You reported carbonation that already feels right."
          : "You reported a balanced tang rather than strong sweetness or spoilage.",
      ],
      immediateAction:
        stage === "f2"
          ? "Refrigerate when the carbonation is where you want it."
          : "Taste now and decide whether to move on to F2.",
      nextCheck: "Use the batch detail page if you want the linked next action and timeline context.",
    });
  }

  if (
    (context.timing?.status === "too_early" || context.timing?.status === "approaching") &&
    (tasteImpression === "still_sweet" || tasteImpression === "not_enough_carbonation")
  ) {
    return buildResult(context, {
      headline: "It may simply be a little early",
      severity: "monitor_check_soon",
      interpretation:
        "The batch does not sound clearly ready yet, but the timing still fits an early or approaching window rather than a warning state.",
      whyTheAppThinksThis: [
        context.timing
          ? `The timing helper places it in the ${context.timing.statusLabel.toLowerCase()} range.`
          : "Your answers sound earlier than the usual ready window.",
        "Your taste impression still points to sweetness or not enough carbonation.",
      ],
      immediateAction: "Keep monitoring rather than forcing a decision too early.",
      nextCheck: "Check again soon using taste, carbonation, and the batch timing card together.",
    });
  }

  if (measuredPh != null && measuredPh > 4.2) {
    return buildResult(context, {
      headline: "This does not sound ready from a pH perspective yet",
      severity: "caution",
      interpretation:
        "A measured pH still above 4.2 means the assistant should not present this as clearly ready, even if taste alone feels uncertain.",
      whyTheAppThinksThis: [`You entered a measured pH of ${measuredPh.toFixed(1)}.`],
      immediateAction: "Keep checking rather than treating it as finished.",
      nextCheck: "Re-check soon and use both taste and safety signals together.",
    });
  }

  return buildResult(context, {
    headline: "Use timing as a guide, then confirm with taste or observation",
    severity: "monitor_check_soon",
    interpretation:
      "This sits in the overlap between normal timing guidance and your own taste or observation, so the app should guide the next check rather than claim certainty.",
    whyTheAppThinksThis: [
      context.timing
        ? `The timing helper says ${context.timing.statusLabel.toLowerCase()}.`
        : "No attached timing estimate is available.",
      "Your current inputs do not point to a clear urgent or discard state.",
    ],
    immediateAction: "Follow the next batch action and check again if the taste or pressure still feels uncertain.",
    nextCheck: "Open batch detail for the linked next action and timing summary.",
  });
}

function evaluateStrands(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const texture = getTextAnswer(context, "texture");
  const color = getTextAnswer(context, "color");

  if (hasRottenSmell(context) || texture === "fuzzy" || color === "unusual_color") {
    const severity: TroubleshootingSeverity =
      texture === "fuzzy" || color === "unusual_color" ? "discard_unsafe" : "caution";

    return buildResult(context, {
      headline:
        severity === "discard_unsafe"
          ? "This does not sound like a normal yeast or pellicle change"
          : "This needs a more cautious check",
      severity,
      interpretation:
        severity === "discard_unsafe"
          ? "Stringy yeast and sediment can be normal, but fuzzy texture or unusual colors are not something the app should treat as a safe normal pattern."
          : "The description is not clearly normal enough for the assistant to wave through.",
      whyTheAppThinksThis: [
        texture === "fuzzy"
          ? "You described a fuzzy or furry texture."
          : "The texture is not the usual stringy or smooth pattern.",
        color === "unusual_color"
          ? "You also reported an unusual color."
          : hasRottenSmell(context)
            ? "You also reported a rotten or unusual smell."
            : "That pushes it out of the clearly normal bucket.",
      ],
      immediateAction:
        severity === "discard_unsafe"
          ? "Do not treat this as a normal fermentation artifact."
          : "Pause before consuming it and inspect carefully.",
      nextCheck:
        severity === "discard_unsafe"
          ? "If the growth is fuzzy or unusually colored on the surface, discard the batch."
          : "Compare it against the discard and danger-sign guide before deciding.",
      escalationNote:
        severity === "discard_unsafe"
          ? "Fuzzy surface growth or unusual colors should be treated much more seriously than normal yeast strands or sediment."
          : undefined,
    });
  }

  return buildResult(context, {
    headline: "This sounds more like a normal fermentation artifact",
    severity: "likely_normal",
    interpretation:
      "Yeast strands, sediment, and a smooth new pellicle layer are all common enough that the app should not label them dangerous by default.",
    whyTheAppThinksThis: [
      texture === "stringy"
        ? "You described a stringy pattern, which often matches yeast strands."
        : texture === "sediment"
          ? "You described sediment-like material, which is commonly normal."
          : "You described a smooth new layer rather than dry fuzzy spots.",
      "You did not also report a rotten smell or unusual color.",
    ],
    immediateAction: "Keep observing rather than discarding it immediately.",
    nextCheck: "Watch for any shift toward fuzzy surface growth, unusual colors, or a rotten smell.",
  });
}

function evaluateMoldConcern(context: TroubleshootingEvaluationContext): TroubleshootingResult {
  const surfaceGrowth = getTextAnswer(context, "surface_growth");
  const surfaceTexture = getTextAnswer(context, "surface_texture");
  const surfaceColor = getTextAnswer(context, "surface_color");
  const smoothOrFuzzy = getTextAnswer(context, "smooth_or_fuzzy");

  const strongMoldSignal =
    (surfaceGrowth === "yes" && surfaceTexture === "yes") ||
    smoothOrFuzzy === "dry_fuzzy_spots" ||
    surfaceColor === "green_blue_black";

  if (strongMoldSignal) {
    return buildResult(context, {
      headline: "Treat this as a discard case",
      severity: "discard_unsafe",
      interpretation:
        "Dry fuzzy surface growth or unusual colored surface contamination is not something the app should frame as a normal kombucha variation.",
      whyTheAppThinksThis: [
        surfaceColor === "green_blue_black"
          ? "You reported an unusual surface color."
          : "You reported fuzzy or dry surface growth.",
        "That fits the app's conservative discard path rather than a normal pellicle path.",
      ],
      immediateAction: "Do not consume it, do not reuse the culture, and discard the batch.",
      nextCheck: "If needed, review the relevant guide so the next batch is easier to compare.",
      escalationNote: "Do not try to salvage or reuse a culture from this batch.",
    });
  }

  if (
    surfaceTexture === "no" &&
    smoothOrFuzzy === "smooth_wet_layer" &&
    !hasRottenSmell(context)
  ) {
    return buildResult(context, {
      headline: "This may be a normal surface pellicle rather than mold",
      severity: "monitor_check_soon",
      interpretation:
        "A smooth wet layer can be normal culture growth, so the assistant should not call it mold with confidence from this description alone.",
      whyTheAppThinksThis: [
        "You did not describe a dry fuzzy texture.",
        "You also described it as a smooth wet layer instead.",
      ],
      immediateAction: "Keep watching it closely rather than consuming based on this description alone.",
      nextCheck: "If it turns fuzzy, dry, or unusually colored, move immediately to discard guidance.",
    });
  }

  return buildResult(context, {
    headline: "This is too ambiguous to call safely normal",
    severity: "caution",
    interpretation:
      "The description does not clearly match a safe normal pellicle, but it also does not yet give a fully confident mold confirmation.",
    whyTheAppThinksThis: [
      "You are not fully sure whether the growth is smooth and wet or dry and fuzzy.",
      "When mold uncertainty remains, the assistant should lean cautious rather than reassuring.",
    ],
    immediateAction: "Do not rush to drink it while the surface description is still unclear.",
    nextCheck: "If you can confirm dry fuzzy spots or unusual colored surface growth, discard it.",
    escalationNote: "If uncertainty remains after a closer look, caution is still the safer bias.",
  });
}

const evaluators: Record<
  TroubleshootingIssueId,
  (context: TroubleshootingEvaluationContext) => TroubleshootingResult
> = {
  too_sour: evaluateTooSour,
  too_sweet_or_not_fermenting: evaluateTooSweet,
  no_carbonation: evaluateNoCarbonation,
  too_much_carbonation: evaluateTooMuchCarbonation,
  not_sure_if_ready: evaluateNotSureIfReady,
  strange_strands_or_sediment: evaluateStrands,
  mold_concern: evaluateMoldConcern,
};

export function evaluateTroubleshootingIssue(
  issueId: TroubleshootingIssueId,
  context: TroubleshootingEvaluationContext
) {
  return evaluators[issueId](context);
}
