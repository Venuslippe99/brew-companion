import { getPhaseOutcomeLabel } from "@/lib/phase-outcome-options";
import type {
  FamilyGraphEdge,
  VisibleFamilyGraph,
  VisibleFamilyGraphNode,
} from "@/lib/lineage-graph";

export type LineageNodeBadgeTone = "neutral" | "positive" | "caution";

export type LineageNodeBadge = {
  key: string;
  label: string;
  tone: LineageNodeBadgeTone;
};

export type LineageInsight = {
  key:
    | "best_result"
    | "common_issue"
    | "strong_repeat_candidate"
    | "strong_starter_source";
  title: string;
  summary: string;
  batchId?: string;
  batchName?: string;
};

export type LineageAnalytics = {
  insights: LineageInsight[];
  nodeBadgesById: Map<string, LineageNodeBadge[]>;
  familyOutcomeCount: number;
};

const NEGATIVE_F2_TAGS = new Set(["too_flat", "too_fizzy", "flavor_too_weak", "flavor_too_strong", "too_sour", "too_sweet"]);
const POSITIVE_F2_TAGS = new Set(["carbonation_just_right", "flavor_worked_well"]);

function hasNegativeF2Signal(node: VisibleFamilyGraphNode) {
  if (!node.f2Outcome) {
    return false;
  }

  if (
    node.f2Outcome.f2_overall_result === "bad" ||
    node.f2Outcome.f2_overall_result === "disappointing" ||
    node.f2Outcome.f2_brew_again === "no"
  ) {
    return true;
  }

  return node.f2Outcome.selected_tags.some((tag) => NEGATIVE_F2_TAGS.has(tag));
}

function isRepeatCandidate(node: VisibleFamilyGraphNode) {
  if (!node.f2Outcome) {
    return false;
  }

  return (
    (node.f2Outcome.f2_overall_result === "excellent" ||
      node.f2Outcome.f2_overall_result === "good") &&
    node.f2Outcome.f2_brew_again === "yes" &&
    !hasNegativeF2Signal(node)
  );
}

function isReferenceBatch(node: VisibleFamilyGraphNode) {
  if (!node.f2Outcome) {
    return false;
  }

  return (
    (node.f2Outcome.f2_overall_result === "excellent" ||
      node.f2Outcome.f2_overall_result === "good") &&
    !hasNegativeF2Signal(node)
  );
}

function getOutcomeScore(node: VisibleFamilyGraphNode) {
  if (!node.f2Outcome) {
    return -1;
  }

  let score = 0;

  switch (node.f2Outcome.f2_overall_result) {
    case "excellent":
      score += 5;
      break;
    case "good":
      score += 4;
      break;
    case "okay":
      score += 3;
      break;
    case "disappointing":
      score += 2;
      break;
    case "bad":
      score += 1;
      break;
  }

  switch (node.f2Outcome.f2_brew_again) {
    case "yes":
      score += 2;
      break;
    case "maybe_with_changes":
      score += 1;
      break;
    case "no":
      score -= 1;
      break;
  }

  node.f2Outcome.selected_tags.forEach((tag) => {
    if (POSITIVE_F2_TAGS.has(tag)) {
      score += 1;
    }

    if (NEGATIVE_F2_TAGS.has(tag)) {
      score -= 1;
    }
  });

  return score;
}

function buildStarterDescendantMap(edges: FamilyGraphEdge[]) {
  const children = new Map<string, string[]>();

  edges
    .filter((edge) => edge.type === "starter_source")
    .forEach((edge) => {
      const existing = children.get(edge.sourceId) || [];
      existing.push(edge.targetId);
      children.set(edge.sourceId, existing);
    });

  return children;
}

function collectStarterDescendants(
  startId: string,
  childrenByParent: Map<string, string[]>
) {
  const visited = new Set<string>();
  const queue = [...(childrenByParent.get(startId) || [])];

  while (queue.length > 0) {
    const currentId = queue.shift();

    if (!currentId || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    const childIds = childrenByParent.get(currentId) || [];
    childIds.forEach((childId) => queue.push(childId));
  }

  return [...visited];
}

function getNegativeIssueSignals(node: VisibleFamilyGraphNode) {
  const issues: string[] = [];

  if (node.f1Outcome?.f1_taste_state === "too_sweet") {
    issues.push("too_sweet_f1");
  }

  if (node.f1Outcome?.f1_taste_state === "too_sour") {
    issues.push("too_sour_f1");
  }

  if (node.f1Outcome?.selected_tags.includes("too_acidic")) {
    issues.push("too_acidic");
  }

  if (node.f2Outcome) {
    node.f2Outcome.selected_tags.forEach((tag) => {
      if (NEGATIVE_F2_TAGS.has(tag)) {
        issues.push(tag);
      }
    });
  }

  return issues;
}

function getIssueLabel(issue: string) {
  switch (issue) {
    case "too_sweet_f1":
      return "F1 stayed too sweet";
    case "too_sour_f1":
      return "F1 ran too sour";
    case "too_acidic":
      return "Too acidic";
    default:
      return getPhaseOutcomeLabel(issue);
  }
}

export function buildLineageAnalytics(graph: VisibleFamilyGraph): LineageAnalytics {
  const insights: LineageInsight[] = [];
  const nodeBadgesById = new Map<string, LineageNodeBadge[]>();
  const nodesWithF2 = graph.nodes.filter((node) => !!node.f2Outcome);

  graph.nodes.forEach((node) => {
    const badges: LineageNodeBadge[] = [];

    if (isReferenceBatch(node)) {
      badges.push({ key: "reference_batch", label: "Reference batch", tone: "positive" });
    }

    if (isRepeatCandidate(node)) {
      badges.push({ key: "repeat_candidate", label: "Repeat candidate", tone: "positive" });
    }

    const firstNegativeTag = node.f2Outcome?.selected_tags.find((tag) => NEGATIVE_F2_TAGS.has(tag));
    if (firstNegativeTag) {
      badges.push({
        key: firstNegativeTag,
        label: getPhaseOutcomeLabel(firstNegativeTag),
        tone: "caution",
      });
    }

    nodeBadgesById.set(node.id, badges.slice(0, 2));
  });

  if (nodesWithF2.length >= 2) {
    const bestNode = [...nodesWithF2].sort((left, right) => getOutcomeScore(right) - getOutcomeScore(left))[0];

    if (bestNode?.f2Outcome) {
      insights.push({
        key: "best_result",
        title: "Best result in this family so far",
        batchId: bestNode.id,
        batchName: bestNode.name,
        summary: `${bestNode.name} stands out with ${getPhaseOutcomeLabel(bestNode.f2Outcome.f2_overall_result).toLowerCase()} feedback and ${getPhaseOutcomeLabel(bestNode.f2Outcome.f2_brew_again).toLowerCase()} for brewing again.`,
      });
    }
  }

  const issueCounts = new Map<string, { count: number; sampleNode?: VisibleFamilyGraphNode }>();
  graph.nodes.forEach((node) => {
    getNegativeIssueSignals(node).forEach((issue) => {
      const existing = issueCounts.get(issue);

      if (existing) {
        existing.count += 1;
        return;
      }

      issueCounts.set(issue, { count: 1, sampleNode: node });
    });
  });

  const topIssue = [...issueCounts.entries()]
    .filter(([, value]) => value.count >= 2)
    .sort((left, right) => right[1].count - left[1].count)[0];

  if (topIssue) {
    const [issue, value] = topIssue;
    insights.push({
      key: "common_issue",
      title: "Common issue in this family so far",
      batchId: value.sampleNode?.id,
      batchName: value.sampleNode?.name,
      summary: `${getIssueLabel(issue)} appears in ${value.count} related batches so far, so this looks like a repeating family pattern rather than a one-off result.`,
    });
  }

  const repeatCandidates = graph.nodes.filter(isRepeatCandidate);
  if (repeatCandidates.length > 0 && nodesWithF2.length >= 2) {
    const candidate = [...repeatCandidates].sort(
      (left, right) => getOutcomeScore(right) - getOutcomeScore(left)
    )[0];

    if (candidate) {
      insights.push({
        key: "strong_repeat_candidate",
        title: "Strong repeat candidate",
        batchId: candidate.id,
        batchName: candidate.name,
        summary: `${candidate.name} looks like a strong repeat candidate because its saved F2 outcome was positive, brew-again intent was strong, and there are no obvious negative result tags.`,
      });
    }
  }

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const starterChildrenByParent = buildStarterDescendantMap(graph.edges);
  const strongStarterSources = graph.nodes
    .map((node) => {
      const descendantIds = collectStarterDescendants(node.id, starterChildrenByParent);
      const positiveDescendants = descendantIds
        .map((id) => nodesById.get(id))
        .filter((descendant): descendant is VisibleFamilyGraphNode => !!descendant)
        .filter((descendant) => isReferenceBatch(descendant));

      return {
        node,
        positiveDescendantCount: positiveDescendants.length,
      };
    })
    .filter((item) => item.positiveDescendantCount >= 2)
    .sort((left, right) => right.positiveDescendantCount - left.positiveDescendantCount);

  const strongStarter = strongStarterSources[0];
  if (strongStarter) {
    const existingBadges = nodeBadgesById.get(strongStarter.node.id) || [];
    const starterBadge: LineageNodeBadge = {
      key: "strong_starter_source",
      label: "Strong starter source",
      tone: "positive",
    };
    nodeBadgesById.set(
      strongStarter.node.id,
      [starterBadge, ...existingBadges].slice(0, 2)
    );

    insights.push({
      key: "strong_starter_source",
      title: "Strong starter source",
      batchId: strongStarter.node.id,
      batchName: strongStarter.node.name,
      summary: `${strongStarter.node.name} has ${strongStarter.positiveDescendantCount} positive starter-line descendants so far, which makes it the strongest starter source in this family right now.`,
    });
  }

  return {
    insights,
    nodeBadgesById,
    familyOutcomeCount: nodesWithF2.length,
  };
}
