export type BatchStage =
  | "f1_active"
  | "f1_check_window"
  | "f1_extended"
  | "f2_setup"
  | "f2_active"
  | "refrigerate_now"
  | "chilled_ready"
  | "completed"
  | "archived"
  | "discarded";

export type BatchStatus = "active" | "completed" | "archived" | "discarded";

export interface KombuchaBatch {
  id: string;
  name: string;
  status: BatchStatus;
  currentStage: BatchStage;
  brewStartedAt: string;
  totalVolumeMl: number;
  teaType: string;
  sugarG: number;
  starterLiquidMl: number;
  scobyPresent: boolean;
  avgRoomTempC: number;
  vesselType: string;
  targetPreference: "sweeter" | "balanced" | "tart";
  initialPh?: number;
  initialNotes?: string;
  cautionLevel: "none" | "low" | "moderate" | "high";
  readinessWindowStart?: string;
  readinessWindowEnd?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface BatchReminder {
  id: string;
  batchId: string;
  batchName: string;
  title: string;
  description: string;
  dueAt: string;
  isCompleted: boolean;
  urgencyLevel: "low" | "medium" | "high" | "overdue";
  reminderType: string;
}

export interface FlavourPreset {
  id: string;
  name: string;
  category: string;
  sweetnessIntensity: number;
  flavourIntensity: number;
  suggestedMinPer500ml: number;
  suggestedMaxPer500ml: number;
  defaultUnit: string;
  carbonationTendency: "low" | "moderate" | "high";
  cautionNotes?: string;
}

export interface GuideArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  readTime: string;
  sections: { title: string; body: string }[];
}

// Helper
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export function getDayNumber(brewStartedAt: string): number {
  const start = new Date(brewStartedAt);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStageLabel(stage: BatchStage): string {
  const labels: Record<BatchStage, string> = {
    f1_active: "F1 Active",
    f1_check_window: "Check Window",
    f1_extended: "Extended F1",
    f2_setup: "F2 Setup",
    f2_active: "F2 Active",
    refrigerate_now: "Refrigerate Now",
    chilled_ready: "Chilled & Ready",
    completed: "Completed",
    archived: "Archived",
    discarded: "Discarded",
  };
  return labels[stage];
}

export function getStageColor(stage: BatchStage): string {
  const colors: Record<BatchStage, string> = {
    f1_active: "stage-f1",
    f1_check_window: "stage-check",
    f1_extended: "stage-f1",
    f2_setup: "stage-f2",
    f2_active: "stage-f2",
    refrigerate_now: "stage-danger",
    chilled_ready: "stage-ready",
    completed: "stage-complete",
    archived: "stage-complete",
    discarded: "stage-danger",
  };
  return colors[stage];
}

export function getNextAction(batch: KombuchaBatch): string {
  const actions: Record<BatchStage, string> = {
    f1_active: "Wait & monitor fermentation",
    f1_check_window: "Taste test recommended",
    f1_extended: "Taste test & evaluate",
    f2_setup: "Set up F2 bottles",
    f2_active: "Monitor carbonation",
    refrigerate_now: "Move to refrigerator",
    chilled_ready: "Enjoy your brew!",
    completed: "Batch complete",
    archived: "Archived",
    discarded: "Discarded",
  };
  return actions[batch.currentStage];
}

export const mockBatches: KombuchaBatch[] = [
  {
    id: "1",
    name: "Morning Sun Blend",
    status: "active",
    currentStage: "f1_active",
    brewStartedAt: daysAgo(5),
    totalVolumeMl: 3800,
    teaType: "Green tea & white tea blend",
    sugarG: 200,
    starterLiquidMl: 400,
    scobyPresent: true,
    avgRoomTempC: 23,
    vesselType: "Glass jar",
    targetPreference: "balanced",
    initialPh: 4.2,
    cautionLevel: "none",
    readinessWindowStart: daysAgo(-2),
    readinessWindowEnd: daysAgo(-5),
    updatedAt: daysAgo(0),
  },
  {
    id: "2",
    name: "Tropical Burst",
    status: "active",
    currentStage: "f2_active",
    brewStartedAt: daysAgo(10),
    totalVolumeMl: 3800,
    teaType: "Black tea",
    sugarG: 220,
    starterLiquidMl: 380,
    scobyPresent: true,
    avgRoomTempC: 25,
    vesselType: "Glass jar",
    targetPreference: "balanced",
    cautionLevel: "moderate",
    updatedAt: daysAgo(0),
  },
  {
    id: "3",
    name: "Classic Oolong",
    status: "active",
    currentStage: "f1_check_window",
    brewStartedAt: daysAgo(8),
    totalVolumeMl: 4000,
    teaType: "Oolong tea",
    sugarG: 200,
    starterLiquidMl: 400,
    scobyPresent: true,
    avgRoomTempC: 22,
    vesselType: "Ceramic crock",
    targetPreference: "tart",
    initialPh: 4.0,
    cautionLevel: "none",
    readinessWindowStart: daysAgo(1),
    readinessWindowEnd: daysAgo(-3),
    updatedAt: daysAgo(1),
  },
  {
    id: "4",
    name: "Berry Bliss",
    status: "completed",
    currentStage: "completed",
    brewStartedAt: daysAgo(21),
    totalVolumeMl: 3500,
    teaType: "Black tea",
    sugarG: 180,
    starterLiquidMl: 350,
    scobyPresent: true,
    avgRoomTempC: 24,
    vesselType: "Glass jar",
    targetPreference: "sweeter",
    cautionLevel: "none",
    completedAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "5",
    name: "Ginger Fire",
    status: "archived",
    currentStage: "archived",
    brewStartedAt: daysAgo(45),
    totalVolumeMl: 3000,
    teaType: "Black tea",
    sugarG: 200,
    starterLiquidMl: 300,
    scobyPresent: true,
    avgRoomTempC: 22,
    vesselType: "Glass jar",
    targetPreference: "tart",
    cautionLevel: "none",
    completedAt: daysAgo(30),
    updatedAt: daysAgo(30),
  },
];

export const mockReminders: BatchReminder[] = [
  {
    id: "r1",
    batchId: "3",
    batchName: "Classic Oolong",
    title: "Taste check recommended",
    description: "Your Classic Oolong has entered the check window. Taste to evaluate sourness and decide whether to move to F2.",
    dueAt: daysAgo(0),
    isCompleted: false,
    urgencyLevel: "high",
    reminderType: "taste_check",
  },
  {
    id: "r2",
    batchId: "2",
    batchName: "Tropical Burst",
    title: "Burp bottles",
    description: "High sugar F2 with warm room temperature. Burp bottles to release excess pressure.",
    dueAt: daysAgo(1),
    isCompleted: false,
    urgencyLevel: "overdue",
    reminderType: "burp_bottles",
  },
  {
    id: "r3",
    batchId: "1",
    batchName: "Morning Sun Blend",
    title: "Check fermentation progress",
    description: "Day 5 — check for SCOBY formation and vinegar aroma development.",
    dueAt: daysAgo(-2),
    isCompleted: false,
    urgencyLevel: "low",
    reminderType: "general_check",
  },
];

export const flavourPresets: FlavourPreset[] = [
  { id: "f1", name: "Strawberry", category: "Berries", sweetnessIntensity: 7, flavourIntensity: 8, suggestedMinPer500ml: 30, suggestedMaxPer500ml: 60, defaultUnit: "g", carbonationTendency: "moderate", cautionNotes: "Pulp can clog narrow bottle necks" },
  { id: "f2", name: "Blueberry", category: "Berries", sweetnessIntensity: 6, flavourIntensity: 7, suggestedMinPer500ml: 25, suggestedMaxPer500ml: 50, defaultUnit: "g", carbonationTendency: "moderate" },
  { id: "f3", name: "Raspberry", category: "Berries", sweetnessIntensity: 5, flavourIntensity: 8, suggestedMinPer500ml: 20, suggestedMaxPer500ml: 45, defaultUnit: "g", carbonationTendency: "high", cautionNotes: "Seeds may settle. Produces strong carbonation." },
  { id: "f4", name: "Mango", category: "Tropical", sweetnessIntensity: 8, flavourIntensity: 9, suggestedMinPer500ml: 30, suggestedMaxPer500ml: 60, defaultUnit: "g", carbonationTendency: "high", cautionNotes: "Very active fermentation. Burp frequently." },
  { id: "f5", name: "Pineapple", category: "Tropical", sweetnessIntensity: 7, flavourIntensity: 8, suggestedMinPer500ml: 25, suggestedMaxPer500ml: 50, defaultUnit: "ml (juice)", carbonationTendency: "high", cautionNotes: "Juice form creates rapid carbonation." },
  { id: "f6", name: "Passion Fruit", category: "Tropical", sweetnessIntensity: 6, flavourIntensity: 9, suggestedMinPer500ml: 15, suggestedMaxPer500ml: 35, defaultUnit: "ml (pulp)", carbonationTendency: "moderate" },
  { id: "f7", name: "Lemon", category: "Citrus", sweetnessIntensity: 2, flavourIntensity: 7, suggestedMinPer500ml: 10, suggestedMaxPer500ml: 25, defaultUnit: "ml (juice)", carbonationTendency: "low" },
  { id: "f8", name: "Ginger", category: "Spices", sweetnessIntensity: 1, flavourIntensity: 9, suggestedMinPer500ml: 5, suggestedMaxPer500ml: 15, defaultUnit: "g (grated)", carbonationTendency: "high", cautionNotes: "Fresh ginger creates significant carbonation. Start with less." },
  { id: "f9", name: "Apple", category: "Fruit", sweetnessIntensity: 6, flavourIntensity: 5, suggestedMinPer500ml: 30, suggestedMaxPer500ml: 60, defaultUnit: "ml (juice)", carbonationTendency: "moderate" },
  { id: "f10", name: "Hibiscus", category: "Herbs & Flowers", sweetnessIntensity: 2, flavourIntensity: 7, suggestedMinPer500ml: 3, suggestedMaxPer500ml: 8, defaultUnit: "g (dried)", carbonationTendency: "low" },
  { id: "f11", name: "Lavender", category: "Herbs & Flowers", sweetnessIntensity: 1, flavourIntensity: 6, suggestedMinPer500ml: 1, suggestedMaxPer500ml: 3, defaultUnit: "g (dried)", carbonationTendency: "low", cautionNotes: "Very aromatic. Use sparingly." },
  { id: "f12", name: "Peach", category: "Fruit", sweetnessIntensity: 7, flavourIntensity: 6, suggestedMinPer500ml: 30, suggestedMaxPer500ml: 55, defaultUnit: "g", carbonationTendency: "moderate" },
];

export const guideArticles: GuideArticle[] = [
  {
    id: "g1",
    slug: "kombucha-basics",
    title: "Kombucha Basics",
    category: "Kombucha Basics",
    summary: "Everything you need to know about kombucha — what it is, how it works, and why people brew it at home.",
    readTime: "5 min",
    sections: [
      { title: "What is Kombucha?", body: "Kombucha is a fermented tea beverage made by combining sweetened tea with a symbiotic culture of bacteria and yeast (SCOBY). The fermentation process converts sugar into organic acids, carbon dioxide, and a small amount of alcohol, resulting in a tangy, slightly effervescent drink rich in probiotics." },
      { title: "The Two Stages", body: "Kombucha brewing happens in two main stages. **First Fermentation (F1)** is where sweetened tea ferments with the SCOBY in an open vessel covered with cloth. This typically takes 7–14 days. **Second Fermentation (F2)** is where the kombucha is bottled with added flavourings and sealed to build carbonation, usually 2–4 days." },
      { title: "Key Ingredients", body: "You need four things: **tea** (black, green, or oolong work best), **sugar** (plain white sugar is most reliable), **starter liquid** (mature kombucha from a previous batch or store-bought raw kombucha), and a **SCOBY** (though starter liquid alone can grow one)." },
      { title: "Safety Basics", body: "Kombucha is generally safe when brewed with clean equipment and proper acidification. Always use clean hands and vessels. Never use metal containers for fermentation. If you see black, fuzzy mould on the surface, discard the entire batch including the SCOBY. Trust your senses — if something smells rotten rather than vinegary, err on the side of caution." },
    ],
  },
  {
    id: "g2",
    slug: "starting-f1",
    title: "Starting Your First Fermentation",
    category: "F1 Process",
    summary: "A step-by-step guide to setting up your first F1 brew, from preparing tea to adding starter liquid.",
    readTime: "7 min",
    sections: [
      { title: "Prepare Your Tea", body: "Brew a strong batch of tea using roughly 4–6 tea bags (or 4–6 teaspoons loose leaf) per gallon of water. Use caffeinated tea — the culture needs it. Herbal teas alone won't work. Add your sugar while the tea is hot (typically 1 cup / 200g per gallon) and stir until dissolved." },
      { title: "Cool Completely", body: "Let your sweetened tea cool to room temperature before adding the SCOBY or starter liquid. Hot liquid will damage or kill the culture. This is the most common beginner mistake — patience here is critical." },
      { title: "Add Starter Liquid", body: "Pour in 1–2 cups of mature kombucha (starter liquid) per gallon batch. This acidifies the tea immediately, creating a hostile environment for unwanted bacteria and giving your SCOBY a head start. The more acidic your starter, the safer and faster your fermentation will begin." },
      { title: "Cover and Wait", body: "Place your SCOBY on top (it may sink — that's fine), cover with a tightly woven cloth or coffee filter, secure with a rubber band, and place in a warm spot (20–28°C / 68–82°F) away from direct sunlight. Now the waiting begins." },
      { title: "What to Expect", body: "Within a few days you should notice a new SCOBY forming on the surface — a thin, translucent film. The liquid will gradually become more tart and less sweet. Bubbles may appear. These are all good signs. If you see fuzzy, coloured (especially black or green) mould on top, discard everything." },
    ],
  },
  {
    id: "g3",
    slug: "scoby-and-starter",
    title: "Understanding SCOBY & Starter Liquid",
    category: "Starter Liquid & SCOBY",
    summary: "What a SCOBY actually is, why starter liquid matters more than you think, and how to maintain both.",
    readTime: "6 min",
    sections: [
      { title: "What is a SCOBY?", body: "SCOBY stands for Symbiotic Culture of Bacteria and Yeast. It's the rubbery, pancake-like disc that floats on top of your kombucha. It's a biofilm — a living mat of cellulose produced by the bacteria. While it looks important, the real magic is in the liquid, not the disc itself." },
      { title: "Starter Liquid is Key", body: "Starter liquid — mature, acidic kombucha — is actually more important than the SCOBY disc for successful brewing. It instantly lowers the pH of your fresh tea, protecting against harmful bacteria. You can brew kombucha with just starter liquid and no SCOBY disc. A new SCOBY will grow." },
      { title: "Maintaining Your Culture", body: "Keep a SCOBY hotel — a jar with extra SCOBYs and strong starter liquid, covered with cloth, at room temperature. Top up occasionally with sweet tea. This is your backup supply and a source of strong starter for new batches." },
    ],
  },
  {
    id: "g4",
    slug: "f1-tasting",
    title: "When to Taste & How to Evaluate F1",
    category: "Readiness & Tasting",
    summary: "How to know when your F1 is ready, what to taste for, and how to decide your next step.",
    readTime: "4 min",
    sections: [
      { title: "When to Start Tasting", body: "Most F1 brews benefit from at least 7 days at room temperature (22–25°C). In warmer conditions, fermentation is faster — you might start tasting at day 5–6. In cooler conditions, wait until day 8–10. Use a clean straw or spoon to taste without disturbing the SCOBY too much." },
      { title: "What to Look For", body: "Taste for the balance between sweetness and tartness. Too sweet means more fermentation time is needed. Too vinegary means it's gone too far for most people's taste (but can be used as starter liquid). Aim for a pleasant tang with just a hint of residual sweetness." },
      { title: "Deciding Next Steps", body: "If the flavour is where you want it: move to F2 for carbonation and flavouring. If it's still too sweet: wait 1–2 more days and taste again. If it's very tart: consider using it as extra-strong starter liquid, or proceed to F2 with sweeter flavourings." },
    ],
  },
  {
    id: "g5",
    slug: "moving-to-f2",
    title: "How to Move into F2",
    category: "F2 Flavouring",
    summary: "The transition from first fermentation to bottling — equipment, process, and common pitfalls.",
    readTime: "6 min",
    sections: [
      { title: "Prepare Your Bottles", body: "Use pressure-rated bottles designed for fermentation — swing-top (Grolsch-style) bottles are popular. Avoid decorative bottles or thin glass. Clean and sanitise all bottles before use. Have more bottles ready than you think you need." },
      { title: "Remove the SCOBY", body: "With clean hands, gently remove the SCOBY and set it aside in a clean bowl with 1–2 cups of kombucha. This becomes your starter for the next batch. Handle with care but don't worry — SCOBYs are resilient." },
      { title: "Add Flavourings", body: "Place your chosen flavourings (fruit, juice, herbs, ginger) into each bottle before adding kombucha. Leave about 1–2 inches of headspace at the top. The sugar in the fruit will feed continued fermentation, building carbonation in the sealed bottle." },
      { title: "Seal and Wait", body: "Cap tightly and place in a warm spot for 2–4 days. The sealed environment traps CO2, creating carbonation. Check (burp) bottles daily if using high-sugar fruits. When carbonation level is satisfactory, move to the refrigerator to slow fermentation." },
    ],
  },
  {
    id: "g6",
    slug: "f2-flavouring-basics",
    title: "F2 Flavouring Basics",
    category: "F2 Flavouring",
    summary: "A guide to choosing fruits, herbs, and other additions for your second fermentation.",
    readTime: "5 min",
    sections: [
      { title: "Choosing Flavours", body: "Almost any fruit works, but some produce better results. Berries, tropical fruits, citrus juice, ginger, and herbs like lavender are all popular. Fresh, frozen, dried, juice, and purée forms all work — each behaves slightly differently in terms of sugar content and carbonation." },
      { title: "Sugar and Carbonation", body: "More sugar = more potential carbonation. Fruits with high natural sugar (mango, grape, pineapple) create more vigorous F2 fermentation. If adding extra sugar on top of fruit, proceed with caution and burp bottles regularly." },
      { title: "Amount Guidelines", body: "A good starting point is about 10–15% fruit by volume. For a 500ml bottle, that's roughly 50–75ml of fruit or juice. Start on the lower end if you're new to F2 — you can always add more next time." },
    ],
  },
  {
    id: "g7",
    slug: "carbonation-pressure",
    title: "Carbonation & Pressure Safety",
    category: "Carbonation & Bottling",
    summary: "Understanding carbonation buildup, bottle safety, and how to avoid dangerous over-pressurisation.",
    readTime: "5 min",
    sections: [
      { title: "How Carbonation Works", body: "In a sealed bottle, yeast continues to consume sugar and produce CO2. Since the gas can't escape, it dissolves into the liquid, creating fizz. The more sugar available (from added fruit, juice, or extra sugar), the more CO2 is produced." },
      { title: "Pressure Risks", body: "Over-carbonation is the biggest safety concern in F2. Too much sugar + warm temperatures + time = excessive pressure. In extreme cases, bottles can explode. This is why proper bottle selection, burping, and refrigeration timing matter." },
      { title: "Burping Bottles", body: "\"Burping\" means briefly opening the bottle to release excess pressure. Do this over a sink. If you see vigorous fizzing when you open, the carbonation is building well — you may want to refrigerate soon. Burp daily for high-sugar F2 setups." },
      { title: "When to Refrigerate", body: "Once carbonation reaches your desired level (usually 2–4 days), move bottles to the refrigerator. Cold temperatures dramatically slow fermentation, effectively stopping further CO2 production. Always refrigerate before serving." },
    ],
  },
  {
    id: "g8",
    slug: "common-mistakes",
    title: "Common Kombucha Mistakes",
    category: "Common Mistakes",
    summary: "The most frequent errors beginners and intermediate brewers make, and how to avoid them.",
    readTime: "5 min",
    sections: [
      { title: "Adding SCOBY to Hot Tea", body: "This kills the culture. Always cool your tea completely to room temperature before combining." },
      { title: "Not Enough Starter Liquid", body: "Skipping or skimping on starter liquid is the most common cause of slow, weak, or contaminated batches. Use at least 10% of your batch volume as mature starter." },
      { title: "Using the Wrong Tea", body: "Herbal teas (chamomile, rooibos) lack the caffeine and nutrients the SCOBY needs. Stick to black, green, white, or oolong tea, especially as a beginner." },
      { title: "Ignoring F2 Pressure", body: "Never leave high-sugar F2 bottles unattended for days in warm conditions without burping. This is how bottles explode. Start conservative and build experience." },
      { title: "Confusing SCOBY Growth with Mould", body: "New SCOBY growth can look strange — translucent, bubbly, uneven. That's normal. Mould is distinctly fuzzy, dry, and coloured (black, green, white fuzz). Mould grows ON TOP, not submerged." },
    ],
  },
  {
    id: "g9",
    slug: "danger-signs",
    title: "Danger Signs & When to Discard",
    category: "Danger Signs",
    summary: "How to identify contamination, mould, and other issues that mean a batch should be thrown out.",
    readTime: "4 min",
    sections: [
      { title: "Mould", body: "Fuzzy, dry, coloured growth on the surface is mould. It's usually black, green, blue, or white and fuzzy. It appears on TOP, not submerged. If you see mould, discard the entire batch AND the SCOBY. Do not try to salvage." },
      { title: "Foul Smell", body: "Kombucha should smell vinegary, yeasty, or slightly fruity — never rotten, cheesy, or putrid. A strong vinegar smell is fine (just means it fermented a long time). A rotten or off-putting smell means contamination. Discard." },
      { title: "Fruit Flies or Insects", body: "If fruit flies have accessed your brew, the batch may be contaminated with acetobacter or other unwanted organisms. Cover tightly during F1 to prevent this." },
      { title: "When in Doubt, Discard", body: "Kombucha is inexpensive to make. If something doesn't look, smell, or taste right, it's not worth the risk. Start a fresh batch with clean equipment and strong starter liquid." },
    ],
  },
  {
    id: "g10",
    slug: "cleaning-equipment",
    title: "Cleaning & Equipment Basics",
    category: "Cleaning & Equipment",
    summary: "What vessels, bottles, and tools you need, and how to keep everything clean and safe.",
    readTime: "4 min",
    sections: [
      { title: "Essential Equipment", body: "A large glass jar (1 gallon / 4 litres), tightly woven cloth or coffee filter, rubber band, swing-top bottles for F2, a funnel, and a measuring cup. Avoid metal containers for fermentation — glass, food-grade plastic, or ceramic only." },
      { title: "Cleaning", body: "Wash all equipment with hot water and mild dish soap. Rinse thoroughly — soap residue can harm the culture. For extra sanitisation, rinse with white vinegar. Avoid antibacterial soap or bleach near your brewing equipment." },
      { title: "Between Batches", body: "Clean your fermentation vessel between each batch. Inspect for cracks or residue buildup. Replace cloth covers if they become stretched or thin. Keep your workspace tidy — fermentation is cleanest in a clean environment." },
    ],
  },
];
