// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SavedF2SetupView } from "@/components/f2/F2SetupWizard";
import type { LoadedF2Setup } from "@/lib/f2-current-setup";

const BASE_SETUP: LoadedF2Setup = {
  id: "setup-1",
  ambientTempC: 24,
  desiredCarbonationLevel: "balanced",
  estimatedPressureRisk: "moderate",
  reserveForStarterMl: 300,
  totalF1AvailableMl: 3800,
  availableForBottlingMl: 3500,
  bottleCount: 6,
  plannedBottleVolumeMl: 3000,
  plannedKombuchaFillMl: 2800,
  recipeNameSnapshot: "2 group flavour plans",
  recipeSnapshotJson: null,
  setupCreatedAt: "2026-03-25T10:00:00.000Z",
  groups: [
    {
      id: "group-a",
      bottleCount: 3,
      bottleSizeMl: 500,
      bottleType: "swing_top",
      headspaceMl: 20,
      targetFillMl: 480,
      groupLabel: "Orange bottles",
      sortOrder: 0,
      recipeMode: "saved",
      selectedRecipeId: "recipe-a",
      guidedMode: true,
      recipeNameSnapshot: "Orange lift",
      recipeDescriptionSnapshot: "Citrus",
      recipeSnapshotJson: { items: [{ customIngredientName: "Orange juice" }] },
      bottles: [],
    },
    {
      id: "group-b",
      bottleCount: 3,
      bottleSizeMl: 330,
      bottleType: "crown_cap",
      headspaceMl: 15,
      targetFillMl: 315,
      groupLabel: "Tester bottles",
      sortOrder: 1,
      recipeMode: "none",
      selectedRecipeId: null,
      guidedMode: true,
      recipeNameSnapshot: null,
      recipeDescriptionSnapshot: null,
      recipeSnapshotJson: { items: [] },
      bottles: [],
    },
  ],
  bottles: [],
};

describe("SavedF2SetupView", () => {
  it("renders multiple group flavour summaries", () => {
    render(
      <SavedF2SetupView
        setup={BASE_SETUP}
        currentStage="f2_active"
        currentNextAction="Check first bottle for carbonation"
        actionLoading={null}
        onCheckedOneBottle={vi.fn()}
        onNeedsMoreCarbonation={vi.fn()}
        onRefrigerateNow={vi.fn()}
        onMovedToFridge={vi.fn()}
        onMarkCompleted={vi.fn()}
      />
    );

    expect(screen.getByText("Orange bottles")).toBeTruthy();
    expect(screen.getByText("Tester bottles")).toBeTruthy();
    expect(screen.getByText("Orange lift")).toBeTruthy();
    expect(screen.getByText("No added flavourings")).toBeTruthy();
    expect(screen.getByText("2 group flavour plans")).toBeTruthy();
  });
});
