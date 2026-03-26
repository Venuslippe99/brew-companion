import { useLocation } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { NewBatchWizard } from "@/components/f1/new-batch-wizard/NewBatchWizard";
import { useAuth } from "@/contexts/use-auth";
import { isBrewAgainNavigationState } from "@/lib/brew-again";
import type { BrewAgainNavigationState } from "@/lib/brew-again-types";

export default function NewBatch() {
  const location = useLocation();
  const { user } = useAuth();

  const brewAgainState = isBrewAgainNavigationState(location.state)
    ? (location.state as BrewAgainNavigationState)
    : null;

  return (
    <AppLayout>
      <div className="page-canvas">
        <NewBatchWizard userId={user?.id} brewAgainState={brewAgainState} />
      </div>
    </AppLayout>
  );
}
