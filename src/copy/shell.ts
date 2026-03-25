import { batchLibraryCopy } from "@/copy/batch-library";
import { f1LibraryCopy } from "@/copy/f1-library";
import { settingsCopy } from "@/copy/settings";

export const shellCopy = {
  brand: {
    name: "Kombloom",
    subtitle: "Kombucha Companion",
  },
  nav: {
    home: "Home",
    batches: "Batches",
    newBatch: "New Batch",
    guides: "Guides",
    assistant: "Assistant",
    settings: "Settings",
  },
  header: {
    back: "Go back",
  },
  titles: {
    home: "Home",
    myBatches: batchLibraryCopy.page.title,
    newBatch: "New Batch",
    batchDetail: "Batch",
    f2Setup: "F2 Setup",
    lineage: "Lineage",
    f1Recipes: f1LibraryCopy.recipes.page.title,
    f1Vessels: f1LibraryCopy.vessels.page.title,
    settings: settingsCopy.page.title,
    guides: "Guides",
    assistant: "Assistant",
  },
  subtitles: {
    home: "Brewing overview",
    myBatches: "Brewing library",
    newBatch: "Guided F1 setup",
    f2Setup: "Second Fermentation",
    lineage: "Lineage explorer",
    f1Recipes: "Reusable brew defaults",
    f1Vessels: "Saved fermentation vessels",
    settings: "Preferences",
  },
};
