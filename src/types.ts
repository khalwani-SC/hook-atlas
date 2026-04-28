export type HookPattern = "Interrupt" | "Intrigue" | "Clarify" | "Reward";

export type HookCategory =
  | "Curiosity"
  | "Bold"
  | "Questions"
  | "Emotional"
  | "Authority"
  | "Visual"
  | "Audio"
  | "Editing"
  | "Text"
  | "Story"
  | "Interrupts"
  | "Education";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";
export type Funnel = "TOF" | "MOF" | "BOF";
export type ProductionTier = "UGC" | "Studio" | "AI" | "Found";
export type Intent = "Curiosity" | "Authority" | "Story" | "Urgency" | "Education" | "Contrast" | "Exclusive";

export interface PatternMeta {
  key: HookPattern;
  description: string;
  color: string;
  bg: string;
}

export interface CategoryMeta {
  key: HookCategory;
  label: string;
  color: string;
}

export interface HookVariation {
  name: string;
  description: string;
}

export interface VerticalExample {
  verticalId: string;
  verticalName: string;
  verticalColor: string;
  script: string;
  visualDirection: string;
  format: "ugc" | "studio" | "pov" | "product" | "screen";
}

export interface Hook {
  id: string;
  displayName: string;
  name: string;
  category: HookCategory;
  categoryLabel: string;
  subcategory: string;
  pattern: HookPattern;
  secondaryPattern?: HookPattern;
  intent: Intent;
  description: string;
  example: string;
  caption: string;
  whatItIs: string;
  whenToUse: string[];
  whenNotToUse: string[];
  shootingSteps: string[];
  variations: HookVariation[];
  related: string[];
  tags: string[];
  difficulty: Difficulty;
  effectiveness: number;
  featured?: boolean;
  funnelFit: Funnel[];
  productionTier: ProductionTier;
  mediaTier: "video" | "still" | "placeholder";
  videoUrl?: string;
  thumbnailUrl?: string;
  palette: [string, string];
  verticalExamples: VerticalExample[];
}

export interface InspirationVideo {
  id: string;
  title: string;
  tags: string[];
  status: "promoted" | "unassigned";
  assignedHookId?: string;
  matchId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  palette: [string, string];
}

export interface FirstThreeSecondAnalysis {
  firstFrame: string;
  firstTextOrAudio: string;
  attentionMechanic: string;
  matchingReason: string;
}

export interface MediaHookMatch {
  id: string;
  title: string;
  sourcePath: string;
  productVertical: string;
  fitConfidence: "strong" | "medium" | "gap";
  firstThreeSeconds?: FirstThreeSecondAnalysis;
  visualTraits: string[];
  scriptSignals: string[];
  primaryHookIds: string[];
  secondaryHookIds: string[];
  suggestedCategoryIds: string[];
  bestFor: string[];
  avoidFor: string[];
}

export interface HookGapSuggestion {
  id: string;
  proposedCategory: string;
  proposedHookName: string;
  pattern: HookPattern;
  intent: Intent;
  whenToCreate: string;
  exampleLine: string;
  mediaSignals: string[];
}

export interface VerticalProfile {
  id: string;
  name: string;
  color: string;
  prompt: string;
}

export interface AdBrief {
  hookId: string;
  intent: Intent | "All";
  funnel?: Funnel;
  production?: ProductionTier;
  openingLine: string;
  visualDirection: string;
  format: string;
}
