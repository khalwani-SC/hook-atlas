import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Copy,
  Download,
  ExternalLink,
  Grid2X2,
  Image as ImageIcon,
  Lightbulb,
  Menu,
  Pause,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import {
  categoryMeta,
  hooks,
  inspirationVideos,
  intentLabels,
  mediaHookMatrix,
  patternMeta,
  productionTiers,
} from "./data";
import validationSeed from "../data/validation-decisions.json";
import type {
  FirstThreeSecondAnalysis,
  Funnel,
  Hook,
  HookCategory,
  HookPattern,
  InspirationVideo,
  Intent,
  ProductionTier,
} from "./types";

type ViewMode = "atlas" | "inspiration" | "builder";
type SortMode = "featured" | "validated" | "rated" | "easy" | "advanced";
type PatternFilter = HookPattern | "All";
type CategoryFilter = HookCategory | "All";
type IntentFilter = Intent | "All";
type FeedFilter = "all" | "inbox" | "promoted" | "unassigned";
type ValidationStatus = "inbox" | "validated" | "rejected";
type PlatformFit = "Snap";
type ValidationConfidence = "strong" | "medium" | "needs-review";
type QualityScoreKey = "taste" | "clarity" | "novelty" | "repeatability" | "paidFit" | "organicFit" | "productionEase";
type DecisionStore = Record<string, ValidationDecision>;
type ValidationDbStatus = "loading" | "synced" | "local";
type SmartAnalysisStatus = "scanning" | "ready" | "fallback";

interface ValidationEvidence {
  firstFrame: string;
  firstTextOrAudio: string;
  firstMovement: string;
  attentionMechanic: string;
  matchingReason: string;
}

type QualityScores = Record<QualityScoreKey, number>;

interface ValidationDecision {
  videoId: string;
  hookId: string;
  pattern: HookPattern | "";
  category: HookCategory | "";
  tags: string[];
  notes: string;
  status: ValidationStatus;
  sourceBrand: string;
  productVertical: string;
  platform: PlatformFit;
  funnel: Funnel | "";
  confidence: ValidationConfidence;
  firstThree: ValidationEvidence;
  alternateHookIds: string[];
  scores: QualityScores;
  updatedAt: string;
}

interface SmartMediaAnalysis {
  status: SmartAnalysisStatus;
  source: "local-frame-scan" | "metadata-matrix";
  tags: string[];
  frameSignals: string[];
  mediaSignals: string[];
  frameSummary: string;
  recognitionSummary: string;
}

interface HookEvidenceExample {
  video: InspirationVideo;
  decision?: ValidationDecision;
  mediaMatch?: (typeof mediaHookMatrix)[number];
  firstThree: ValidationEvidence;
  status: "validated" | "suggested";
}

const patternOrder: HookPattern[] = ["Interrupt", "Intrigue", "Clarify", "Reward"];
const categoryOrder = Object.keys(categoryMeta) as HookCategory[];
const funnelOptions: Funnel[] = ["TOF", "MOF", "BOF"];
const difficultyScore = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const validationStorageKey = "hook-atlas.validation-decisions.v1";
const validationApiPath = "/api/validation-decisions";
const lockedSnapPlatform: PlatformFit = "Snap";
const platformOptions: PlatformFit[] = [lockedSnapPlatform];
const confidenceOptions: ValidationConfidence[] = ["strong", "medium", "needs-review"];
const defaultScores: QualityScores = {
  taste: 7,
  clarity: 7,
  novelty: 6,
  repeatability: 7,
  paidFit: 6,
  organicFit: 7,
  productionEase: 6,
};
const scoreLabels: Record<QualityScoreKey, string> = {
  taste: "Taste",
  clarity: "Clarity",
  novelty: "Novelty",
  repeatability: "Repeatable",
  paidFit: "Paid fit",
  organicFit: "Organic fit",
  productionEase: "Ease",
};
const scoreOrder = Object.keys(defaultScores) as QualityScoreKey[];

function readViewFromUrl(): ViewMode {
  const params = new URLSearchParams(window.location.search);
  const queryView = params.get("view");
  const hash = window.location.hash.replace("#", "");
  if (queryView === "inspiration" || hash === "inspiration") return "inspiration";
  if (queryView === "builder" || hash === "ad-builder" || hash === "builder") return "builder";
  return "atlas";
}

function hashForView(view: ViewMode) {
  if (view === "builder") return "#ad-builder";
  if (view === "inspiration") return "#inspiration";
  return "";
}

function writeUrl(view: ViewMode, hookId?: string | null) {
  const params = new URLSearchParams(window.location.search);
  params.set("view", view);
  if (hookId) params.set("hook", hookId);
  else params.delete("hook");
  window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${hashForView(view)}`);
}

function getHookFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("hook");
}

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function resolveAssetUrl(url?: string) {
  if (!url) return undefined;
  if (/^(?:[a-z][a-z0-9+.-]*:|data:|blob:)/i.test(url)) return url;
  const mediaBaseUrl = import.meta.env.VITE_MEDIA_BASE_URL;
  if (mediaBaseUrl && url.startsWith("/media/")) {
    return `${mediaBaseUrl.replace(/\/+$/, "")}${url}`;
  }
  if (!url.startsWith("/")) return url;
  const base = import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${url.replace(/^\/+/, "")}`;
}

function isValidationStatus(value: unknown): value is ValidationStatus {
  return value === "inbox" || value === "validated" || value === "rejected";
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function parseTagInput(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}

function isPlatformFit(value: unknown): value is PlatformFit {
  return typeof value === "string" && platformOptions.includes(value as PlatformFit);
}

function isValidationConfidence(value: unknown): value is ValidationConfidence {
  return typeof value === "string" && confidenceOptions.includes(value as ValidationConfidence);
}

function isFunnel(value: unknown): value is Funnel {
  return value === "TOF" || value === "MOF" || value === "BOF";
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function clampScore(value: unknown, fallback: number) {
  const next = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(1, Math.min(10, Math.round(next)));
}

function normalizeScores(input: unknown): QualityScores {
  const item = input && typeof input === "object" ? (input as Partial<QualityScores>) : {};
  return {
    taste: clampScore(item.taste, defaultScores.taste),
    clarity: clampScore(item.clarity, defaultScores.clarity),
    novelty: clampScore(item.novelty, defaultScores.novelty),
    repeatability: clampScore(item.repeatability, defaultScores.repeatability),
    paidFit: clampScore(item.paidFit, defaultScores.paidFit),
    organicFit: clampScore(item.organicFit, defaultScores.organicFit),
    productionEase: clampScore(item.productionEase, defaultScores.productionEase),
  };
}

function normalizeEvidence(input: unknown): ValidationEvidence {
  const item = input && typeof input === "object" ? (input as Partial<ValidationEvidence>) : {};
  return {
    firstFrame: textValue(item.firstFrame),
    firstTextOrAudio: textValue(item.firstTextOrAudio),
    firstMovement: textValue(item.firstMovement),
    attentionMechanic: textValue(item.attentionMechanic),
    matchingReason: textValue(item.matchingReason),
  };
}

function getMediaMatch(video: InspirationVideo) {
  return video.matchId ? mediaHookMatrix.find((item) => item.id === video.matchId) : undefined;
}

function inferSourceBrand(video: InspirationVideo, match = getMediaMatch(video)) {
  const source = match?.title ?? video.title;
  const knownBrands = [
    "Steve Madden",
    "Ramadan",
    "Heinz",
    "Disney",
    "Pixar",
    "Airbnb",
    "Bepanthen",
    "Bonita",
    "Loewe",
    "Kenco",
    "Jordan",
    "Adidas",
    "Bitpanda",
    "Freedom",
    "RoseSkinCo",
  ];
  const brand = knownBrands.find((item) => source.toLowerCase().includes(item.toLowerCase()));
  if (brand) return brand;
  return source.split(/[-:|/]/)[0].trim().split(" ").slice(0, 2).join(" ");
}

function inferPlatform(video: InspirationVideo, match = getMediaMatch(video)): PlatformFit {
  void video;
  void match;
  return lockedSnapPlatform;
}

function inferFunnel(video: InspirationVideo, match = getMediaMatch(video)): Funnel {
  const content = `${video.title} ${match?.scriptSignals.join(" ") ?? ""} ${match?.bestFor.join(" ") ?? ""}`.toLowerCase();
  if (content.includes("proof") || content.includes("testimonial") || content.includes("offer")) return "MOF";
  if (content.includes("buy") || content.includes("sale") || content.includes("order")) return "BOF";
  return "TOF";
}

function getSuggestedEvidence(video: InspirationVideo): ValidationEvidence {
  const match = getMediaMatch(video);
  const firstThree = match ? getFirstThreeSecondAnalysis(match) : null;
  return {
    firstFrame: firstThree?.firstFrame ?? "Opening frame needs manual review.",
    firstTextOrAudio: firstThree?.firstTextOrAudio ?? "First visible text or spoken line needs manual review.",
    firstMovement: match?.visualTraits[1] ?? "First motion needs manual review.",
    attentionMechanic: firstThree?.attentionMechanic ?? "Attention mechanic not validated yet.",
    matchingReason: firstThree?.matchingReason ?? "Match has not been reviewed by a human yet.",
  };
}

function tagify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 34);
}

function uniqueTagList(values: string[], limit = 18) {
  return normalizeTags(values.map(tagify).filter((tag) => tag.length > 1)).slice(0, limit);
}

function uniqueTextList(values: string[], limit = 8) {
  return normalizeTags(values).slice(0, limit);
}

function keywordTags(content: string) {
  const lower = content.toLowerCase();
  const rules: Array<[string, string[]]> = [
    ["snap|bitmoji|story|order now", ["snap-native"]],
    ["creator|talking head|face|selfie|ugc|testimonial", ["creator-led"]],
    ["product|shoe|boots|sneaker|bottle|card|box|pack|ketchup|deodorant", ["product-visible"]],
    ["unbox|box|package|reveal", ["unboxing"]],
    ["offer|sale|discount|order|buy|48 hour|weekday", ["offer-led"]],
    ["text|headline|overlay|comment|caption|pov|definition", ["text-overlay"]],
    ["pov|first person|hands|hand", ["pov", "hands-pov"]],
    ["split|side-by-side|compare|versus|which one", ["comparison"]],
    ["proof|testimonial|review|results|data", ["proof-signal"]],
    ["fashion|footwear|shoes|boots|sneaker|fit|closet", ["fashion", "footwear"]],
    ["beauty|makeup|skin|hair|bepanthen|roseskin", ["beauty"]],
    ["food|snack|salad|coffee|ketchup|iftar|suhoor", ["food"]],
    ["health|wellness|ramadan|advice", ["wellness"]],
    ["finance|card|visa|bitpanda|freedom", ["finance"]],
    ["travel|flight|airbnb|hajj|transit|hotel", ["travel"]],
    ["gaming|controller|streaming", ["gaming"]],
    ["ai|generated|surreal|glitch|avatar", ["ai-assisted"]],
  ];
  return rules.flatMap(([pattern, tags]) => (new RegExp(pattern).test(lower) ? tags : []));
}

function buildMetadataAnalysis(video: InspirationVideo, match = getMediaMatch(video)): SmartMediaAnalysis {
  const mediaKind = video.videoUrl ? (isGifMedia(video.videoUrl) ? "gif-loop" : "mp4-video") : "placeholder-media";
  const content = [
    video.title,
    video.tags.join(" "),
    match?.title,
    match?.productVertical,
    match?.visualTraits.join(" "),
    match?.scriptSignals.join(" "),
    match?.bestFor.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
  const tags = uniqueTagList([
    "snap",
    "first-3s",
    "auto-tagged",
    mediaKind,
    match?.fitConfidence ? `${match.fitConfidence}-fit` : "needs-route",
    ...video.tags,
    ...(match?.suggestedCategoryIds ?? []),
    ...keywordTags(content),
  ]);
  const firstTrait = match?.visualTraits[0] ?? "source media needs first-frame scan";
  const firstSignal = match?.scriptSignals[0] ?? "first text/audio not detected yet";
  return {
    status: video.videoUrl ? "scanning" : "fallback",
    source: "metadata-matrix",
    tags,
    frameSignals: [firstTrait],
    mediaSignals: [mediaKind, ...keywordTags(content)].slice(0, 6),
    frameSummary: firstTrait,
    recognitionSummary: `Matrix read: ${firstSignal}. Tags and route are generated from the source metadata, visual traits, and hook fit.`,
  };
}

function buildAutoTags(
  video: InspirationVideo,
  match: ReturnType<typeof getMediaMatch>,
  hook: Hook | null,
  analysis?: SmartMediaAnalysis,
) {
  return uniqueTagList([
    "snap",
    "auto-tagged",
    "first-3s",
    hook?.displayName ?? "",
    hook?.category ?? "",
    hook?.pattern ?? "",
    hook?.intent ?? "",
    match?.productVertical ?? "",
    ...(video.tags ?? []),
    ...(match?.suggestedCategoryIds ?? []),
    ...(analysis?.tags ?? []),
  ]);
}

function canvasToMediaAnalysis(canvas: HTMLCanvasElement): Pick<SmartMediaAnalysis, "tags" | "frameSignals" | "frameSummary"> {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { tags: [], frameSignals: ["frame scan unavailable"], frameSummary: "Frame scan unavailable." };
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let brightness = 0;
  let saturation = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  let contrastHits = 0;
  let samples = 0;

  for (let index = 0; index < data.length; index += 64) {
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (r + g + b) / 3;
    brightness += light;
    saturation += max === 0 ? 0 : (max - min) / max;
    red += r;
    green += g;
    blue += b;
    if (max - min > 92) contrastHits += 1;
    samples += 1;
  }

  const avgBrightness = brightness / Math.max(1, samples);
  const avgSaturation = saturation / Math.max(1, samples);
  const dominant =
    green > red * 1.08 && green > blue * 1.08
      ? "green"
      : blue > red * 1.08 && blue > green * 1.08
        ? "cool"
        : red > blue * 1.08
          ? "warm"
          : "neutral";
  const ratio = height / Math.max(1, width);
  const tags = uniqueTagList([
    ratio > 1.55 ? "vertical-9x16" : "non-vertical",
    avgBrightness > 178 ? "bright-frame" : avgBrightness < 84 ? "low-light" : "balanced-light",
    avgSaturation > 0.36 ? "saturated-color" : "soft-color",
    contrastHits / Math.max(1, samples) > 0.22 ? "high-contrast" : "low-contrast",
    `${dominant}-palette`,
  ]);
  const frameSignals = [
    ratio > 1.55 ? "vertical Snap frame" : "non-standard Snap crop",
    avgBrightness > 178 ? "bright first frame" : avgBrightness < 84 ? "dim first frame" : "balanced exposure",
    avgSaturation > 0.36 ? "saturated palette" : "soft palette",
    `${dominant} dominant palette`,
  ];

  return {
    tags,
    frameSignals,
    frameSummary: `${frameSignals[0]}; ${frameSignals[1]}; ${frameSignals[2]}.`,
  };
}

function drawMediaFrame(source: CanvasImageSource) {
  const width =
    source instanceof HTMLVideoElement
      ? source.videoWidth
      : source instanceof HTMLImageElement
        ? source.naturalWidth
        : 0;
  const height =
    source instanceof HTMLVideoElement
      ? source.videoHeight
      : source instanceof HTMLImageElement
        ? source.naturalHeight
        : 0;
  if (!width || !height) throw new Error("Media has no drawable frame.");
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 240 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function scanImageFrame(src: string) {
  return new Promise<Pick<SmartMediaAnalysis, "tags" | "frameSignals" | "frameSummary">>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        resolve(canvasToMediaAnalysis(drawMediaFrame(image)));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = src;
  });
}

function scanVideoFrame(src: string) {
  return new Promise<Pick<SmartMediaAnalysis, "tags" | "frameSignals" | "frameSummary">>((resolve, reject) => {
    const media = document.createElement("video");
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try {
        resolve(canvasToMediaAnalysis(drawMediaFrame(media)));
      } catch (error) {
        reject(error);
      }
    };
    media.crossOrigin = "anonymous";
    media.muted = true;
    media.playsInline = true;
    media.preload = "metadata";
    media.addEventListener("loadeddata", finish, { once: true });
    media.addEventListener("error", reject, { once: true });
    media.src = src;
    media.load();
  });
}

function useSmartMediaAnalysis(video: InspirationVideo, match = getMediaMatch(video)) {
  const metadataAnalysis = useMemo(() => buildMetadataAnalysis(video, match), [match, video]);
  const [analysis, setAnalysis] = useState<SmartMediaAnalysis>(metadataAnalysis);

  useEffect(() => {
    let cancelled = false;
    setAnalysis(metadataAnalysis);
    if (!video.videoUrl) return () => {
      cancelled = true;
    };

    const resolvedVideoUrl = resolveAssetUrl(video.videoUrl) ?? video.videoUrl;
    const scan = isGifMedia(video.videoUrl) ? scanImageFrame(resolvedVideoUrl) : scanVideoFrame(resolvedVideoUrl);
    scan
      .then((frame) => {
        if (cancelled) return;
        setAnalysis({
          ...metadataAnalysis,
          status: "ready",
          source: "local-frame-scan",
          tags: uniqueTagList([...metadataAnalysis.tags, ...frame.tags]),
          frameSignals: uniqueTextList([...metadataAnalysis.frameSignals, ...frame.frameSignals], 8),
          mediaSignals: uniqueTextList([...metadataAnalysis.mediaSignals, ...frame.tags], 8),
          frameSummary: frame.frameSummary,
          recognitionSummary: `${metadataAnalysis.recognitionSummary} Local frame scan added ${frame.frameSignals.join(", ")}.`,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAnalysis({ ...metadataAnalysis, status: "fallback" });
      });

    return () => {
      cancelled = true;
    };
  }, [metadataAnalysis, video.videoUrl]);

  return analysis;
}

function scoreAverage(scores: QualityScores) {
  const values = Object.values(scores);
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function buildDecisionDraft(video: InspirationVideo, decision?: ValidationDecision) {
  const match = getMediaMatch(video);
  const suggested = getSuggestedEvidence(video);
  const assignedHook = video.assignedHookId ? hooks.find((hook) => hook.id === video.assignedHookId) ?? null : null;
  const confidence: ValidationConfidence =
    match?.fitConfidence === "strong" ? "strong" : match?.fitConfidence === "medium" ? "medium" : "needs-review";

  return {
    hookId: decision?.hookId ?? video.assignedHookId ?? "",
    pattern: decision?.pattern ?? assignedHook?.pattern ?? "",
    category: decision?.category ?? assignedHook?.category ?? "",
    tags: decision?.tags.length ? decision.tags : buildAutoTags(video, match, assignedHook),
    notes: decision?.notes ?? "",
    status: decision?.status ?? (assignedHook ? "validated" : "inbox"),
    sourceBrand: decision?.sourceBrand ?? inferSourceBrand(video, match),
    productVertical: decision?.productVertical ?? match?.productVertical ?? video.tags.join(" / "),
    platform: lockedSnapPlatform,
    funnel: decision?.funnel ?? inferFunnel(video, match),
    confidence: decision?.confidence ?? confidence,
    firstThree: {
      firstFrame: decision?.firstThree.firstFrame || suggested.firstFrame,
      firstTextOrAudio: decision?.firstThree.firstTextOrAudio || suggested.firstTextOrAudio,
      firstMovement: decision?.firstThree.firstMovement || suggested.firstMovement,
      attentionMechanic: decision?.firstThree.attentionMechanic || suggested.attentionMechanic,
      matchingReason: decision?.firstThree.matchingReason || suggested.matchingReason,
    },
    alternateHookIds: decision?.alternateHookIds ?? match?.secondaryHookIds.slice(0, 3) ?? [],
    scores: decision?.scores ?? defaultScores,
  };
}

function normalizeValidationDecision(input: unknown): ValidationDecision | null {
  if (!input || typeof input !== "object") return null;
  const item = input as Partial<ValidationDecision>;
  if (typeof item.videoId !== "string" || !item.videoId.trim()) return null;

  const hookId = typeof item.hookId === "string" && hooks.some((hook) => hook.id === item.hookId) ? item.hookId : "";
  const pattern =
    typeof item.pattern === "string" && patternOrder.includes(item.pattern as HookPattern)
      ? (item.pattern as HookPattern)
      : "";
  const category =
    typeof item.category === "string" && categoryOrder.includes(item.category as HookCategory)
      ? (item.category as HookCategory)
      : "";
  const status = isValidationStatus(item.status) ? item.status : hookId ? "validated" : "inbox";
  const alternateHookIds = Array.isArray(item.alternateHookIds)
    ? item.alternateHookIds.filter((id): id is string => typeof id === "string" && hooks.some((hook) => hook.id === id))
    : [];

  return {
    videoId: item.videoId.trim(),
    hookId,
    pattern,
    category,
    tags: normalizeTags(item.tags),
    notes: typeof item.notes === "string" ? item.notes : "",
    status,
    sourceBrand: textValue(item.sourceBrand),
    productVertical: textValue(item.productVertical),
    platform: isPlatformFit(item.platform) ? item.platform : lockedSnapPlatform,
    funnel: isFunnel(item.funnel) ? item.funnel : "",
    confidence: isValidationConfidence(item.confidence) ? item.confidence : hookId ? "medium" : "needs-review",
    firstThree: normalizeEvidence(item.firstThree),
    alternateHookIds,
    scores: normalizeScores(item.scores),
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
  };
}

function normalizeDecisionStore(input: unknown): DecisionStore {
  const rawItems =
    Array.isArray(input)
      ? input
      : input && typeof input === "object" && Array.isArray((input as { decisions?: unknown }).decisions)
        ? (input as { decisions: unknown[] }).decisions
        : input && typeof input === "object"
          ? Object.values(input)
          : [];

  return rawItems.reduce<DecisionStore>((store, item) => {
    const decision = normalizeValidationDecision(item);
    if (decision) store[decision.videoId] = decision;
    return store;
  }, {});
}

function mergeDecisionStores(...stores: DecisionStore[]) {
  return stores.reduce<DecisionStore>((merged, store) => {
    Object.values(store).forEach((decision) => {
      const existing = merged[decision.videoId];
      const existingTime = existing ? Date.parse(existing.updatedAt) || 0 : 0;
      const nextTime = Date.parse(decision.updatedAt) || 0;
      if (!existing || nextTime >= existingTime) merged[decision.videoId] = decision;
    });
    return merged;
  }, {});
}

function decisionStoresEqual(a: DecisionStore, b: DecisionStore) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readValidationDecisions(): DecisionStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(validationStorageKey);
    return raw ? normalizeDecisionStore(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

function readSeedValidationDecisions(): DecisionStore {
  return normalizeDecisionStore(validationSeed);
}

function writeValidationDecisions(decisions: DecisionStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(validationStorageKey, JSON.stringify(decisions));
}

async function fetchValidationDatabase() {
  const response = await fetch(validationApiPath, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Validation database returned ${response.status}`);
  return normalizeDecisionStore(await response.json());
}

async function persistValidationDatabase(decisions: DecisionStore) {
  const payload = {
    schema: validationStorageKey,
    updatedAt: new Date().toISOString(),
    decisions: Object.values(decisions).sort((a, b) => a.videoId.localeCompare(b.videoId)),
  };
  const response = await fetch(validationApiPath, {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
  if (!response.ok) throw new Error(`Validation database returned ${response.status}`);
  return normalizeDecisionStore(await response.json());
}

function getEffectiveVideoState(video: InspirationVideo, decision?: ValidationDecision) {
  const assignedHookId =
    decision && decision.status !== "rejected"
      ? decision.status === "validated"
        ? decision.hookId || undefined
        : undefined
      : video.assignedHookId;
  const status: InspirationVideo["status"] = assignedHookId ? "promoted" : "unassigned";
  const tags = normalizeTags([...(video.tags ?? []), ...(decision?.tags ?? [])]);
  const reviewStatus = decision?.status ?? "inbox";

  return { assignedHookId, status, tags, reviewStatus };
}

function getHookEvidenceExamples(hookId: string, decisions: DecisionStore): HookEvidenceExample[] {
  const examples: HookEvidenceExample[] = [];
  inspirationVideos.forEach((video) => {
    const decision = decisions[video.id];
    const effective = getEffectiveVideoState(video, decision);
    if (effective.assignedHookId !== hookId) return;
    const mediaMatch = getMediaMatch(video);
    examples.push({
      video,
      decision,
      mediaMatch,
      firstThree: decision?.firstThree ?? getSuggestedEvidence(video),
      status: decision?.status === "validated" ? "validated" : "suggested",
    });
  });

  return examples.sort((a, b) => {
    const statusScore = Number(b.status === "validated") - Number(a.status === "validated");
    if (statusScore) return statusScore;
    const aScore = a.decision ? scoreAverage(a.decision.scores) : a.mediaMatch?.fitConfidence === "strong" ? 8 : 6;
    const bScore = b.decision ? scoreAverage(b.decision.scores) : b.mediaMatch?.fitConfidence === "strong" ? 8 : 6;
    return bScore - aScore;
  });
}

function exportValidationDecisions(decisions: DecisionStore) {
  const payload = {
    schema: validationStorageKey,
    exportedAt: new Date().toISOString(),
    decisions: Object.values(decisions).sort((a, b) => a.videoId.localeCompare(b.videoId)),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "hook-atlas-validation-decisions.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function App() {
  const [view, setViewState] = useState<ViewMode>(readViewFromUrl);
  const [selectedHookId, setSelectedHookId] = useState<string | null>(getHookFromUrl);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [validationDecisions, setValidationDecisions] = useState<DecisionStore>(() =>
    mergeDecisionStores(readSeedValidationDecisions(), readValidationDecisions()),
  );
  const [validationDbStatus, setValidationDbStatus] = useState<ValidationDbStatus>("loading");
  const [validationRemoteReady, setValidationRemoteReady] = useState(false);

  const selectedHook = hooks.find((hook) => hook.id === selectedHookId) ?? null;

  useEffect(() => {
    let cancelled = false;
    async function hydrateValidationDatabase() {
      const seedDecisions = readSeedValidationDecisions();
      const localDecisions = mergeDecisionStores(seedDecisions, readValidationDecisions());
      try {
        const remoteDecisions = await fetchValidationDatabase();
        if (cancelled) return;
        const merged = mergeDecisionStores(seedDecisions, remoteDecisions, localDecisions);
        setValidationDecisions(merged);
        writeValidationDecisions(merged);
        setValidationRemoteReady(true);
        setValidationDbStatus("synced");
        if (Object.keys(localDecisions).length) await persistValidationDatabase(merged);
      } catch {
        if (cancelled) return;
        setValidationRemoteReady(false);
        setValidationDbStatus("local");
      }
    }
    hydrateValidationDatabase();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    writeValidationDecisions(validationDecisions);
  }, [validationDecisions]);

  useEffect(() => {
    if (!validationRemoteReady) return;
    setValidationDbStatus("loading");
    const timeout = window.setTimeout(() => {
      persistValidationDatabase(validationDecisions)
        .then((remoteDecisions) => {
          setValidationDecisions((current) => {
            const merged = mergeDecisionStores(remoteDecisions, current);
            return decisionStoresEqual(merged, current) ? current : merged;
          });
          setValidationDbStatus("synced");
        })
        .catch(() => {
          setValidationDbStatus("local");
        });
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [validationDecisions, validationRemoteReady]);

  function saveValidationDecision(decision: ValidationDecision) {
    setValidationDecisions((current) => ({ ...current, [decision.videoId]: decision }));
  }

  function clearValidationDecision(videoId: string) {
    setValidationDecisions((current) => {
      const next = { ...current };
      delete next[videoId];
      return next;
    });
  }

  function importValidationDecisions(decisions: DecisionStore) {
    setValidationDecisions((current) => ({ ...current, ...decisions }));
  }

  function setView(next: ViewMode) {
    setViewState(next);
    setMenuOpen(false);
    setSelectedHookId(null);
    writeUrl(next, null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openHook(id: string, targetView = view) {
    setSelectedHookId(id);
    writeUrl(targetView, id);
  }

  function closeHook() {
    setSelectedHookId(null);
    writeUrl(view, null);
  }

  function openRandomHook() {
    const random = hooks[Math.floor(Math.random() * hooks.length)];
    setMenuOpen(false);
    setViewState("atlas");
    setSelectedHookId(random.id);
    writeUrl("atlas", random.id);
  }

  useEffect(() => {
    function onPopState() {
      setViewState(readViewFromUrl());
      setSelectedHookId(getHookFromUrl());
    }
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onPopState);
    };
  }, []);

  return (
    <div className="app">
      {view !== "inspiration" && (
        <TopNav
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          menuOpen={menuOpen}
          onSearchOpen={() => setSearchOpen(true)}
          onSearchClose={() => {
            setSearchOpen(false);
            setSearchQuery("");
          }}
          onSearchChange={setSearchQuery}
          onMenuToggle={() => setMenuOpen((open) => !open)}
          onBrowse={() => setView("atlas")}
          onRandom={openRandomHook}
          onFeed={() => setView("inspiration")}
          onBuilder={() => setView("builder")}
        />
      )}

      {view === "atlas" && (
        <AtlasGallery
          validationDecisions={validationDecisions}
          query={searchQuery}
          onClearSearch={() => {
            setSearchQuery("");
            setSearchOpen(false);
          }}
          onOpenHook={openHook}
          onExplore={() => document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" })}
        />
      )}

      {view === "inspiration" && (
        <InspirationFeed
          dbStatus={validationDbStatus}
          decisions={validationDecisions}
          onBack={() => setView("atlas")}
          onClearDecision={clearValidationDecision}
          onExportDecisions={() => exportValidationDecisions(validationDecisions)}
          onImportDecisions={importValidationDecisions}
          onOpenHook={(id) => {
            setViewState("atlas");
            openHook(id, "atlas");
          }}
          onSaveDecision={saveValidationDecision}
        />
      )}

      {view === "builder" && (
        <AdBuilder validationDecisions={validationDecisions} onBack={() => setView("atlas")} onOpenHook={openHook} />
      )}

      {selectedHook && (
        <HookModal
          hook={selectedHook}
          validationDecisions={validationDecisions}
          visibleHooks={hooks}
          onClose={closeHook}
          onOpenHook={openHook}
        />
      )}
    </div>
  );
}

function TopNav({
  searchOpen,
  searchQuery,
  menuOpen,
  onSearchOpen,
  onSearchClose,
  onSearchChange,
  onMenuToggle,
  onBrowse,
  onRandom,
  onFeed,
  onBuilder,
}: {
  searchOpen: boolean;
  searchQuery: string;
  menuOpen: boolean;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onSearchChange: (value: string) => void;
  onMenuToggle: () => void;
  onBrowse: () => void;
  onRandom: () => void;
  onFeed: () => void;
  onBuilder: () => void;
}) {
  return (
    <nav className="top-nav">
      <button className="brand-mark" type="button" aria-label="The Hook Atlas">
        <span>ha</span>
      </button>

      <div className="nav-actions">
        {searchOpen ? (
          <label className="search-box">
            <Search size={16} />
            <input
              autoFocus
              placeholder="Search hooks, techniques, tags..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <button type="button" aria-label="Close search" onClick={onSearchClose}>
              <X size={16} />
            </button>
          </label>
        ) : (
          <button className="icon-button" type="button" aria-label="Open search" onClick={onSearchOpen}>
            <Search size={20} />
          </button>
        )}

        <div className="menu-wrap">
          <button
            className={classNames("icon-button", menuOpen && "active")}
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={onMenuToggle}
          >
            <Menu size={21} />
          </button>
          {menuOpen && (
            <div className="menu-popover" role="menu">
              <button type="button" role="menuitem" onClick={onBrowse}>
                <Grid2X2 size={16} /> Browse all hooks
              </button>
              <button type="button" role="menuitem" onClick={onRandom}>
                <Sparkles size={16} /> Random hook
              </button>
              <button type="button" role="menuitem" onClick={onFeed}>
                <Lightbulb size={16} /> Inspiration feed
              </button>
              <button type="button" role="menuitem" onClick={onBuilder}>
                <Clipboard size={16} /> Ad Builder
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function AtlasGallery({
  validationDecisions,
  query,
  onClearSearch,
  onOpenHook,
  onExplore,
}: {
  validationDecisions: DecisionStore;
  query: string;
  onClearSearch: () => void;
  onOpenHook: (id: string) => void;
  onExplore: () => void;
}) {
  const [pattern, setPattern] = useState<PatternFilter>("All");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [sort, setSort] = useState<SortMode>("featured");
  const evidenceByHook = useMemo(() => {
    return hooks.reduce<Record<string, HookEvidenceExample[]>>((store, hook) => {
      store[hook.id] = getHookEvidenceExamples(hook.id, validationDecisions);
      return store;
    }, {});
  }, [validationDecisions]);
  const validatedHookCount = Object.values(evidenceByHook).filter((examples) => examples.some((item) => item.status === "validated")).length;
  const validatedExampleCount = Object.values(evidenceByHook).reduce(
    (sum, examples) => sum + examples.filter((item) => item.status === "validated").length,
    0,
  );

  const filteredHooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return hooks
      .filter((hook) => pattern === "All" || hook.pattern === pattern)
      .filter((hook) => category === "All" || hook.category === category)
      .filter((hook) => {
        if (!normalized) return true;
        return [
          hook.displayName,
          hook.name,
          hook.categoryLabel,
          hook.subcategory,
          hook.pattern,
          hook.intent,
          hook.example,
          ...((evidenceByHook[hook.id] ?? []).flatMap((item) => [item.video.title, item.firstThree.attentionMechanic])),
          ...hook.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) => {
        if (sort === "validated") {
          return (evidenceByHook[b.id]?.length ?? 0) - (evidenceByHook[a.id]?.length ?? 0) || sortHooks(a, b, "featured");
        }
        return sortHooks(a, b, sort);
      });
  }, [category, evidenceByHook, pattern, query, sort]);

  return (
    <>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span />
            The Hook Atlas
            <span />
          </div>
          <h1>
            Every Hook.
            <em>Catalogued</em> & Ready.
          </h1>
          <p>A visual gallery of the patterns that earn attention in under two seconds - browse, watch, copy what works.</p>
          <button className="pill-cta" type="button" onClick={onExplore}>
            Explore the collection <ArrowDown size={15} />
          </button>
        </section>

        <section className="filters" id="collection">
          <FilterRow label="Pattern">
            <FilterButton active={pattern === "All"} onClick={() => setPattern("All")}>
              All
            </FilterButton>
            {patternOrder.map((item) => (
              <FilterButton key={item} active={pattern === item} dot={patternMeta[item].color} onClick={() => setPattern(item)}>
                {item} <small>{hooks.filter((hook) => hook.pattern === item).length}</small>
              </FilterButton>
            ))}
          </FilterRow>

          <FilterRow label="Category">
            <FilterButton active={category === "All"} onClick={() => setCategory("All")}>
              All <small>{hooks.length}</small>
            </FilterButton>
            {categoryOrder.map((item) => (
              <FilterButton
                key={item}
                active={category === item}
                dot={categoryMeta[item].color}
                onClick={() => setCategory(item)}
              >
                {item} <small>{hooks.filter((hook) => hook.category === item).length}</small>
              </FilterButton>
            ))}
          </FilterRow>

          <div className="results-bar">
            <span>
              {filteredHooks.length} hooks · {validatedExampleCount} validated sources on {validatedHookCount} hooks
            </span>
            <label>
              Sort
              <select value={sort} onChange={(event: ChangeEvent<HTMLSelectElement>) => setSort(event.target.value as SortMode)}>
                <option value="featured">Featured first</option>
                <option value="validated">Validated first</option>
                <option value="rated">Top rated</option>
                <option value="easy">Easiest first</option>
                <option value="advanced">Advanced first</option>
              </select>
            </label>
          </div>
        </section>

        {filteredHooks.length > 0 ? (
          <section className="masonry-grid" aria-label="Hook cards">
            {filteredHooks.map((hook) => (
              <HookCard key={hook.id} evidence={evidenceByHook[hook.id] ?? []} hook={hook} onOpen={() => onOpenHook(hook.id)} />
            ))}
          </section>
        ) : (
          <EmptyState
            title="No hooks match"
            body="Clear search or loosen the filters to bring the library back."
            actionLabel="Reset view"
            onAction={() => {
              setPattern("All");
              setCategory("All");
              setSort("featured");
              onClearSearch();
            }}
          />
        )}

        <Footer />
      </main>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="filter-row">
      <span className="filter-label">{label}</span>
      <div className="filter-scroll">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  dot,
  children,
  onClick,
}: {
  active: boolean;
  dot?: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={classNames("chip", active && "active")} type="button" onClick={onClick}>
      {dot && <span className="dot" style={{ background: dot }} />}
      {children}
    </button>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <Sparkles size={26} />
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function HookCard({ hook, evidence, onOpen }: { hook: Hook; evidence: HookEvidenceExample[]; onOpen: () => void }) {
  const heroEvidence = evidence[0];
  const validatedCount = evidence.filter((item) => item.status === "validated").length;
  return (
    <button
      className={classNames("hook-card", heroEvidence && "has-evidence")}
      type="button"
      onClick={onOpen}
      aria-label={`Open hook: ${hook.displayName}${validatedCount ? ` (${validatedCount} validated sources)` : hook.featured ? " (Featured)" : ""}`}
    >
      <Poster evidence={heroEvidence} hook={hook} />
      <div className="card-top">
        {validatedCount ? <span className="badge validated">{validatedCount} validated</span> : hook.featured && <span className="badge featured">Featured</span>}
        <span className="badge" style={{ background: patternMeta[hook.pattern].color }}>
          {hook.pattern}
        </span>
      </div>
      <div className="card-bottom">
        <span className="subline">
          <i style={{ background: categoryMeta[hook.category].color }} />
          {hook.subcategory}
        </span>
        <h3>{hook.displayName}</h3>
        {heroEvidence && <p>{heroEvidence.video.title}</p>}
      </div>
    </button>
  );
}

function Poster({ hook, compact = false, evidence }: { hook: Hook; compact?: boolean; evidence?: HookEvidenceExample }) {
  const style = {
    "--poster-a": hook.palette[0],
    "--poster-b": hook.palette[1],
    "--poster-accent": patternMeta[hook.pattern].color,
  } as React.CSSProperties;
  const mediaUrl = evidence?.video.videoUrl ?? hook.videoUrl;
  const thumbnailUrl = evidence?.video.thumbnailUrl ?? hook.thumbnailUrl;
  const resolvedMediaUrl = resolveAssetUrl(mediaUrl);
  const resolvedThumbnailUrl = resolveAssetUrl(thumbnailUrl);
  const isGif = isGifMedia(mediaUrl);
  return (
    <div className={classNames("poster", mediaUrl && "has-media", evidence && "validated-media", compact && "compact")} style={style}>
      {mediaUrl && isGif && (
        <img className="poster-video" src={resolvedMediaUrl} alt="" loading="lazy" decoding="async" aria-hidden="true" />
      )}
      {mediaUrl && !isGif && (
        <video
          className="poster-video"
          src={resolvedMediaUrl}
          poster={resolvedThumbnailUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      )}
      <div className="poster-noise" />
      <div className="poster-frame">
        <span>{hook.caption}</span>
      </div>
      <div className="poster-subject">
        <span />
      </div>
      <div className="poster-caption">{evidence ? evidence.firstThree.attentionMechanic : hook.example}</div>
    </div>
  );
}

function isGifMedia(url?: string) {
  return Boolean(url && /\.gif(?:[?#]|$)/i.test(url));
}

function sortHooks(a: Hook, b: Hook, sort: SortMode) {
  if (sort === "featured") return Number(b.featured) - Number(a.featured) || b.effectiveness - a.effectiveness;
  if (sort === "rated") return b.effectiveness - a.effectiveness || a.displayName.localeCompare(b.displayName);
  if (sort === "easy") return difficultyScore[a.difficulty] - difficultyScore[b.difficulty];
  return difficultyScore[b.difficulty] - difficultyScore[a.difficulty];
}

function HookModal({
  hook,
  validationDecisions,
  visibleHooks,
  onClose,
  onOpenHook,
}: {
  hook: Hook;
  validationDecisions: DecisionStore;
  visibleHooks: Hook[];
  onClose: () => void;
  onOpenHook: (id: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [verticalIndex, setVerticalIndex] = useState(0);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const index = visibleHooks.findIndex((item) => item.id === hook.id);
  const previous = visibleHooks[(index - 1 + visibleHooks.length) % visibleHooks.length];
  const next = visibleHooks[(index + 1) % visibleHooks.length];
  const vertical = hook.verticalExamples[verticalIndex] ?? hook.verticalExamples[0];
  const related = hook.related.map((id) => hooks.find((item) => item.id === id)).filter(Boolean) as Hook[];
  const evidence = getHookEvidenceExamples(hook.id, validationDecisions);
  const heroEvidence = evidence[0];
  const clips = evidence.slice(0, 6);

  useEffect(() => {
    setVerticalIndex(0);
    if (backdropRef.current) backdropRef.current.scrollTop = 0;
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [hook.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onOpenHook(previous.id);
      if (event.key === "ArrowRight") onOpenHook(next.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next.id, onClose, onOpenHook, previous.id]);

  async function copyText(label: string, text: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(label);
    window.setTimeout(() => setCopied(null), 1400);
  }

  return (
    <div ref={backdropRef} className="modal-backdrop" role="dialog" aria-modal="true" aria-label={`${hook.displayName} details`}>
      <div className="hook-modal">
        <div className="modal-media">
          <Poster evidence={heroEvidence} hook={hook} />
          {heroEvidence && (
            <div className="modal-evidence-caption">
              <span>{heroEvidence.status === "validated" ? "validated creative" : "suggested creative"}</span>
              <strong>{heroEvidence.video.title}</strong>
              <p>{heroEvidence.firstThree.attentionMechanic}</p>
            </div>
          )}
          <div className="player-controls">
            <button type="button" aria-label="Pause video">
              <Pause size={16} />
            </button>
            <span />
            <button
              type="button"
              aria-label="Open media"
              disabled={!heroEvidence?.video.videoUrl}
              onClick={() => {
                const mediaUrl = resolveAssetUrl(heroEvidence?.video.videoUrl);
                if (mediaUrl) window.open(mediaUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" aria-label="Previous hook" onClick={() => onOpenHook(previous.id)}>
            <ArrowLeft size={18} />
          </button>
          <button type="button" aria-label="Next hook" onClick={() => onOpenHook(next.id)}>
            <ArrowRight size={18} />
          </button>
          <button type="button" aria-label="Copy link to this hook" onClick={() => copyText("link", window.location.href)}>
            {copied === "link" ? <Check size={18} /> : <Copy size={18} />}
          </button>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <article className="modal-content" ref={contentRef}>
          <div className="pattern-line" style={{ color: patternMeta[hook.pattern].color }}>
            {hook.pattern} <span>·</span> {patternMeta[hook.pattern].description}
          </div>
          <p className="crumbs">
            {hook.categoryLabel} / {hook.subcategory}
          </p>
          <h2>{hook.displayName}</h2>
          <p className="aka">aka {hook.name}</p>
          <div className="meta-row">
            <Rating value={hook.effectiveness} />
            <span>{hook.difficulty}</span>
            {hook.funnelFit.map((item) => (
              <span key={item}>{item}</span>
            ))}
            <span>{hook.productionTier}</span>
          </div>
          <p className="lead-copy">{hook.description}</p>

          <div className="quote-block">
            <span>On-screen text</span>
            <strong>{hook.caption}</strong>
          </div>

          <InfoSection title="What it is">{hook.whatItIs}</InfoSection>
          <InfoList title="When to use" items={hook.whenToUse} />
          <InfoList title="When it flops" items={hook.whenNotToUse} />

          <div className="example-box">
            <div>
              <h4>Example</h4>
              <button type="button" onClick={() => copyText("script", hook.example)}>
                {copied === "script" ? "Copied" : "Copy"}
              </button>
            </div>
            <p>"{hook.example}"</p>
          </div>

          <section className="detail-panel">
            <div className="section-title">
              <h4>Ad Examples by Vertical</h4>
              <span>{hook.verticalExamples.length} verticals</span>
            </div>
            <div className="vertical-tabs">
              {hook.verticalExamples.map((item, itemIndex) => (
                <button
                  key={item.verticalId}
                  type="button"
                  className={classNames(itemIndex === verticalIndex && "active")}
                  onClick={() => setVerticalIndex(itemIndex)}
                >
                  {item.verticalName}
                </button>
              ))}
            </div>
            <div className="vertical-card" style={{ "--vertical-color": vertical.verticalColor } as React.CSSProperties}>
              <span>{vertical.format}</span>
              <h5>Opening Line</h5>
              <p>"{vertical.script}"</p>
              <h5>Visual Direction</h5>
              <p>{vertical.visualDirection}</p>
            </div>
          </section>

          <InfoList title="How to shoot" items={hook.shootingSteps} />

          <section className="detail-panel">
            <div className="section-title">
              <h4>Named variations</h4>
              <span>{hook.variations.length} subtypes</span>
            </div>
            <div className="variation-grid">
              {hook.variations.map((variation) => (
                <div key={variation.name}>
                  <strong>{variation.name}</strong>
                  <p>{variation.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="detail-panel">
            <div className="section-title">
              <h4>Related hooks</h4>
              <span>{related.length} matches</span>
            </div>
            <div className="related-grid">
              {related.map((item) => (
                <button key={item.id} type="button" onClick={() => onOpenHook(item.id)}>
                  {item.displayName}
                  <span>{item.pattern}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="detail-panel">
            <div className="section-title">
              <h4>Tags</h4>
              <span>{hook.tags.length} tags</span>
            </div>
            <div className="tag-cloud">
              {hook.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </section>

          <section className="detail-panel">
            <div className="section-title">
              <h4>Inspiration clips</h4>
              <span>{clips.length || "No"} validated</span>
            </div>
            <div className="clip-row">
              {clips.length ? (
                clips.map((clip) => (
                  <div className="clip-card" key={clip.video.id}>
                    <MiniPoster video={clip.video} />
                    <div>
                      <span>{clip.status}</span>
                      <strong>{clip.video.title}</strong>
                      <p>{clip.firstThree.attentionMechanic}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="lead-copy">No validated creative is attached yet. Approve a source in Inspiration to populate this hook.</p>
              )}
            </div>
          </section>
        </article>
      </div>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="rating" aria-label={`${value} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className={index < value ? "filled" : ""} />
      ))}
    </span>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-panel">
      <h4>{title}</h4>
      <p>{children}</p>
    </section>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="detail-panel">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function InspirationFeed({
  dbStatus,
  decisions,
  onBack,
  onClearDecision,
  onExportDecisions,
  onImportDecisions,
  onOpenHook,
  onSaveDecision,
}: {
  dbStatus: ValidationDbStatus;
  decisions: DecisionStore;
  onBack: () => void;
  onClearDecision: (videoId: string) => void;
  onExportDecisions: () => void;
  onImportDecisions: (decisions: DecisionStore) => void;
  onOpenHook: (id: string) => void;
  onSaveDecision: (decision: ValidationDecision) => void;
}) {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [selectedVideo, setSelectedVideo] = useState<InspirationVideo | null>(null);
  const [importMessage, setImportMessage] = useState("");
  const feedItems = useMemo(
    () =>
      inspirationVideos.map((video) => {
        const decision = decisions[video.id];
        return { video, decision, effective: getEffectiveVideoState(video, decision) };
      }),
    [decisions],
  );
  const videos = feedItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "inbox") return !item.decision;
    return item.effective.status === filter;
  });
  const counts = {
    all: feedItems.length,
    inbox: feedItems.filter((item) => !item.decision).length,
    promoted: feedItems.filter((item) => item.effective.status === "promoted").length,
    unassigned: feedItems.filter((item) => item.effective.status === "unassigned").length,
  };
  const savedCount = Object.keys(decisions).length;
  const validatedCount = feedItems.filter((item) => item.decision?.status === "validated").length;
  const reviewProgress = Math.round((savedCount / Math.max(feedItems.length, 1)) * 100);
  const selectedIndex = selectedVideo ? feedItems.findIndex((item) => item.video.id === selectedVideo.id) : -1;

  function selectNextUnreviewed() {
    const next = feedItems.find((item) => !item.decision)?.video ?? feedItems[0]?.video ?? null;
    setSelectedVideo(next);
  }

  function selectAdjacentVideo(offset: number) {
    if (selectedIndex < 0) return;
    const next = feedItems[(selectedIndex + offset + feedItems.length) % feedItems.length]?.video;
    if (next) setSelectedVideo(next);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const next = normalizeDecisionStore(parsed);
      const count = Object.keys(next).length;
      if (count) onImportDecisions(next);
      setImportMessage(count ? `${count} saved decisions imported` : "No decisions found in that file");
    } catch {
      setImportMessage("Could not import that JSON file");
    } finally {
      input.value = "";
      window.setTimeout(() => setImportMessage(""), 2400);
    }
  }

  return (
    <main className="feed-view">
      <header className="mode-header">
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> The Atlas
        </button>
        <span>Inspiration</span>
      </header>
      <section className="feed-hero">
        <p className="small-kicker">Raw feed</p>
        <h1>
          Review queue.
          <span>Validate the first 3 seconds.</span>
        </h1>
        <p>Videos that caught our eye. Open a card, validate the first three seconds, and save the exact hook routing so it stays mapped.</p>
        <div className="queue-stats" aria-label="Review queue progress">
          <div>
            <strong>{validatedCount}</strong>
            <span>human validated</span>
          </div>
          <div>
            <strong>{counts.inbox}</strong>
            <span>needs review</span>
          </div>
          <div>
            <strong>{reviewProgress}%</strong>
            <span>routed locally</span>
          </div>
        </div>
        <div className="validation-toolbar">
          <span>{savedCount} saved routing decisions</span>
          <span className={classNames("db-pill", dbStatus === "synced" && "synced", dbStatus === "local" && "local")}>
            Database {dbStatus === "loading" ? "syncing" : dbStatus}
          </span>
          <button type="button" onClick={selectNextUnreviewed}>
            Review next
          </button>
          <label>
            Import JSON
            <input type="file" accept="application/json" onChange={handleImport} />
          </label>
          <button type="button" disabled={!savedCount} onClick={onExportDecisions}>
            Export decisions
          </button>
          {importMessage && <em>{importMessage}</em>}
        </div>
      </section>
      <div className="segmented">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          All <small>{counts.all}</small>
        </FilterButton>
        <FilterButton active={filter === "inbox"} onClick={() => setFilter("inbox")}>
          Inbox <small>{counts.inbox}</small>
        </FilterButton>
        <FilterButton active={filter === "promoted"} onClick={() => setFilter("promoted")}>
          Promoted <small>{counts.promoted}</small>
        </FilterButton>
        <FilterButton active={filter === "unassigned"} onClick={() => setFilter("unassigned")}>
          Unassigned <small>{counts.unassigned}</small>
        </FilterButton>
      </div>
      <section className="feed-grid">
        {videos.map(({ video, decision, effective }) => (
          <button
            key={video.id}
            className="feed-card"
            data-testid={`feed-card-${video.id}`}
            type="button"
            onClick={() => setSelectedVideo(video)}
          >
            <MiniPoster video={video} />
            <span>{effective.tags[0] ?? "inbox"}</span>
            {!decision && effective.status === "promoted" && <b>Suggested</b>}
            {decision?.status === "validated" && <b>Validated</b>}
            {decision?.status === "inbox" && <b className="neutral">Draft</b>}
            {decision?.status === "rejected" && <b className="danger">Rejected</b>}
          </button>
        ))}
      </section>
      {selectedVideo && (
        <VideoPreview
          decision={decisions[selectedVideo.id]}
          video={selectedVideo}
          onClearDecision={onClearDecision}
          onClose={() => setSelectedVideo(null)}
          onExportDecisions={onExportDecisions}
          onNextVideo={() => selectAdjacentVideo(1)}
          onOpenHook={onOpenHook}
          onPreviousVideo={() => selectAdjacentVideo(-1)}
          onSaveDecision={onSaveDecision}
          queueIndex={selectedIndex}
          queueTotal={feedItems.length}
        />
      )}
    </main>
  );
}

function MiniPoster({ video }: { video: InspirationVideo }) {
  const style = { "--poster-a": video.palette[0], "--poster-b": video.palette[1] } as React.CSSProperties;
  const isGif = isGifMedia(video.videoUrl);
  const resolvedVideoUrl = resolveAssetUrl(video.videoUrl);
  const resolvedThumbnailUrl = resolveAssetUrl(video.thumbnailUrl);
  return (
    <div className={classNames("mini-poster", video.videoUrl && "has-media")} style={style}>
      {video.videoUrl && isGif && <img src={resolvedVideoUrl} alt="" loading="lazy" decoding="async" aria-hidden="true" />}
      {video.videoUrl && !isGif && (
        <video
          src={resolvedVideoUrl}
          poster={resolvedThumbnailUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      )}
      {!video.videoUrl && (
        <Video size={30} />
      )}
      <span>{video.id}</span>
    </div>
  );
}

function VideoPreview({
  decision,
  video,
  onClearDecision,
  onClose,
  onExportDecisions,
  onNextVideo,
  onOpenHook,
  onPreviousVideo,
  onSaveDecision,
  queueIndex,
  queueTotal,
}: {
  decision?: ValidationDecision;
  video: InspirationVideo;
  onClearDecision: (videoId: string) => void;
  onClose: () => void;
  onExportDecisions: () => void;
  onNextVideo: () => void;
  onOpenHook: (id: string) => void;
  onPreviousVideo: () => void;
  onSaveDecision: (decision: ValidationDecision) => void;
  queueIndex: number;
  queueTotal: number;
}) {
  const hookOptions = useMemo(() => [...hooks].sort((a, b) => a.displayName.localeCompare(b.displayName)), []);
  const mediaMatch = getMediaMatch(video);
  const smartAnalysis = useSmartMediaAnalysis(video, mediaMatch);
  const matchedHooks =
    mediaMatch?.primaryHookIds
      .concat(mediaMatch.secondaryHookIds)
      .filter((hookId, index, ids) => ids.indexOf(hookId) === index)
      .map((hookId) => hooks.find((hook) => hook.id === hookId))
      .filter((hook): hook is Hook => Boolean(hook)) ?? [];
  const draft = buildDecisionDraft(video, decision);
  const [hookId, setHookId] = useState(draft.hookId);
  const [pattern, setPattern] = useState<HookPattern | "">(draft.pattern);
  const [category, setCategory] = useState<HookCategory | "">(draft.category);
  const [notes, setNotes] = useState(draft.notes);
  const [status, setStatus] = useState<ValidationStatus>(draft.status);
  const [sourceBrand, setSourceBrand] = useState(draft.sourceBrand);
  const [productVertical, setProductVertical] = useState(draft.productVertical);
  const [funnel, setFunnel] = useState<Funnel | "">(draft.funnel);
  const [confidence, setConfidence] = useState<ValidationConfidence>(draft.confidence);
  const [firstThree, setFirstThree] = useState<ValidationEvidence>(draft.firstThree);
  const [alternateHookIds, setAlternateHookIds] = useState<string[]>(draft.alternateHookIds);
  const [scores, setScores] = useState<QualityScores>({ ...draft.scores });
  const [savedState, setSavedState] = useState<"idle" | "saved" | "cleared">("idle");
  const selectedHook = hookId ? hooks.find((hook) => hook.id === hookId) ?? null : null;
  const platform = lockedSnapPlatform;
  const autoTags = useMemo(() => buildAutoTags(video, mediaMatch, selectedHook, smartAnalysis), [mediaMatch, selectedHook, smartAnalysis, video]);
  const visibleTags = autoTags.slice(0, 10);
  const assignmentNote = decision ? "saved · local" : video.assignedHookId ? "suggested · unverified" : "needs routing";
  const titlePrefix = (decision?.status ?? "inbox").toUpperCase();
  const score = scoreAverage(scores);

  useEffect(() => {
    const nextDraft = buildDecisionDraft(video, decision);
    setHookId(nextDraft.hookId);
    setPattern(nextDraft.pattern);
    setCategory(nextDraft.category);
    setNotes(nextDraft.notes);
    setStatus(nextDraft.status);
    setSourceBrand(nextDraft.sourceBrand);
    setProductVertical(nextDraft.productVertical);
    setFunnel(nextDraft.funnel);
    setConfidence(nextDraft.confidence);
    setFirstThree(nextDraft.firstThree);
    setAlternateHookIds(nextDraft.alternateHookIds);
    setScores({ ...nextDraft.scores });
  }, [decision, video]);

  useEffect(() => {
    setSavedState("idle");
  }, [video.id]);

  function handleHookChange(nextHookId: string) {
    const nextHook = hooks.find((hook) => hook.id === nextHookId);
    setHookId(nextHookId);
    setPattern(nextHook?.pattern ?? "");
    setCategory(nextHook?.category ?? "");
    if (nextHookId && status === "inbox") setStatus("validated");
  }

  function updateEvidence(key: keyof ValidationEvidence, value: string) {
    setFirstThree((current) => ({ ...current, [key]: value }));
  }

  function updateScore(key: QualityScoreKey, value: string) {
    setScores((current) => ({ ...current, [key]: clampScore(value, current[key]) }));
  }

  function toggleAlternateHook(nextHookId: string) {
    setAlternateHookIds((current) =>
      current.includes(nextHookId) ? current.filter((id) => id !== nextHookId) : [...current, nextHookId].slice(0, 5),
    );
  }

  function persistDecision(nextStatus = status, overrides: Partial<ValidationDecision> = {}) {
    const nextHookId = overrides.hookId ?? hookId;
    const nextTags = overrides.tags ?? autoTags;
    const nextStatusNormalized =
      nextHookId && nextStatus === "inbox" ? "validated" : !nextHookId && nextStatus === "validated" ? "inbox" : nextStatus;

    if (overrides.hookId !== undefined) setHookId(overrides.hookId);
    if (overrides.status) setStatus(overrides.status);
    if (overrides.confidence) setConfidence(overrides.confidence);

    onSaveDecision({
      videoId: video.id,
      hookId: nextHookId,
      pattern: overrides.pattern ?? pattern,
      category: overrides.category ?? category,
      tags: nextTags,
      notes: overrides.notes ?? notes.trim(),
      status: nextStatusNormalized,
      sourceBrand: overrides.sourceBrand ?? sourceBrand.trim(),
      productVertical: overrides.productVertical ?? productVertical.trim(),
      platform: lockedSnapPlatform,
      funnel: overrides.funnel ?? funnel,
      confidence: overrides.confidence ?? confidence,
      firstThree: overrides.firstThree ?? firstThree,
      alternateHookIds: (overrides.alternateHookIds ?? alternateHookIds).filter(
        (id) => id !== nextHookId && hooks.some((hook) => hook.id === id),
      ),
      scores: overrides.scores ?? scores,
      updatedAt: new Date().toISOString(),
    });
    setSavedState("saved");
    window.setTimeout(() => setSavedState("idle"), 1400);
  }

  function handleSave() {
    persistDecision();
  }

  function handleApproveDraft() {
    persistDecision("validated");
  }

  function handleRejectDraft() {
    persistDecision("rejected", { hookId: "", status: "rejected", confidence: "needs-review" });
  }

  function handleNeedsNewHook() {
    const nextTags = uniqueTagList([...autoTags, "needs-new-hook"]);
    persistDecision("inbox", {
      hookId: "",
      status: "inbox",
      confidence: "needs-review",
      tags: nextTags,
      notes: notes.trim() || "Needs a new hook/category for this opening.",
      alternateHookIds: [],
    });
  }

  function handleClear() {
    onClearDecision(video.id);
    setSavedState("cleared");
    window.setTimeout(() => setSavedState("idle"), 1400);
  }

  return (
    <div className="modal-backdrop validation-backdrop" role="dialog" aria-modal="true" aria-label={`${video.id} preview`}>
      <aside className="validation-drawer" data-testid="validation-drawer">
        <header className="validation-header">
          <span>
            <i /> {titlePrefix} · {video.id} · {queueIndex + 1}/{queueTotal}
          </span>
          <div className="validation-header-actions">
            <button type="button" aria-label="Previous inspiration" onClick={onPreviousVideo}>
              <ArrowLeft size={17} />
            </button>
            <button type="button" aria-label="Next inspiration" onClick={onNextVideo}>
              <ArrowRight size={17} />
            </button>
            <button type="button" aria-label="Close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="validation-media">
          <MiniPoster video={video} />
        </div>

        <div className="validation-body">
          <div className="validation-title-row">
            <div>
              <p>Source</p>
              <h2>{video.title}</h2>
            </div>
            <span>{assignmentNote}</span>
          </div>

          <div className="tag-cloud validation-tags">
            {visibleTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
            <span>score {score}/10</span>
          </div>

          <section className="ai-draft-card">
            <div className="validation-section-head">
              <h3>Smart Detection</h3>
              <span>{smartAnalysis.status === "ready" ? "local frame scan" : smartAnalysis.status === "scanning" ? "scanning media" : "metadata fallback"}</span>
            </div>
            <div className="ai-draft-grid">
              <div>
                <span>Suggested hook</span>
                <strong>{selectedHook?.displayName ?? "Needs human route"}</strong>
              </div>
              <div>
                <span>Brand / vertical</span>
                <strong>
                  {sourceBrand || "Unknown"} · {productVertical || "Unsorted"}
                </strong>
              </div>
              <div>
                <span>Snap route / funnel</span>
                <strong>
                  Snap locked · {funnel || "No funnel"}
                </strong>
              </div>
              <div>
                <span>System confidence</span>
                <strong>{confidence}</strong>
              </div>
            </div>
            <div className="smart-system-strip">
              <span>
                <Sparkles size={14} /> Tags auto-generated
              </span>
              <span>
                <Check size={14} /> Snap-only system
              </span>
              <span>
                <ImageIcon size={14} /> First-frame scan
              </span>
            </div>
            <dl className="ai-readout">
              <div>
                <dt>First frame</dt>
                <dd>{smartAnalysis.frameSummary || firstThree.firstFrame}</dd>
              </div>
              <div>
                <dt>Text/audio</dt>
                <dd>{firstThree.firstTextOrAudio}</dd>
              </div>
              <div>
                <dt>Movement</dt>
                <dd>{firstThree.firstMovement}</dd>
              </div>
              <div>
                <dt>Mechanic</dt>
                <dd>{firstThree.attentionMechanic}</dd>
              </div>
            </dl>
            <div className="smart-tags-panel">
              <span>Auto tags</span>
              <div>
                {autoTags.map((tag) => (
                  <b key={tag}>{tag}</b>
                ))}
              </div>
            </div>
            <div className="recognition-signals">
              {smartAnalysis.frameSignals.slice(0, 4).map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
            <p>{firstThree.matchingReason}</p>
          </section>

          <section className="review-decision-card">
            <div className="validation-section-head">
              <h3>Your Direction</h3>
              <span>{assignmentNote}</span>
            </div>
            <div className="quick-decision-grid">
              <label className="validation-field">
                <span>Hook</span>
                <select
                  data-testid="validation-hook-select"
                  value={hookId}
                  onChange={(event) => handleHookChange(event.target.value)}
                >
                  <option value="">Pick a hook...</option>
                  {hookOptions.map((hook) => (
                    <option key={hook.id} value={hook.id}>
                      {hook.displayName} · {hook.categoryLabel}
                    </option>
                  ))}
                </select>
              </label>
              <div className="detection-lock">
                <span>System does the rest</span>
                <strong>{confidence} confidence · {autoTags.length} tags · Snap</strong>
                <small>Pick/approve the hook. Tags, platform, funnel, evidence, and scores save with it.</small>
              </div>
            </div>
            <div className="quick-review-actions">
              <button className="primary" data-testid="validation-save" type="button" disabled={!hookId} onClick={handleApproveDraft}>
                {savedState === "saved" ? "Saved" : "Approve + auto-fill"}
              </button>
              <button type="button" onClick={handleSave}>
                Save directed route
              </button>
              <button type="button" onClick={handleNeedsNewHook}>
                Needs new hook
              </button>
              <button type="button" onClick={handleRejectDraft}>
                Reject
              </button>
            </div>
            <div className="match-actions compact">
              {matchedHooks.map((hook) => (
                <button
                  key={hook.id}
                  type="button"
                  className={classNames(alternateHookIds.includes(hook.id) && "active")}
                  onClick={() => handleHookChange(hook.id)}
                >
                  <span>{hook.displayName}</span>
                  <small
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleAlternateHook(hook.id);
                    }}
                  >
                    {alternateHookIds.includes(hook.id) ? "alt saved" : "alt"}
                  </small>
                </button>
              ))}
            </div>
            {mediaMatch && mediaMatch.fitConfidence !== "strong" && (
              <p className="lead-copy">
                Suggested lanes: {mediaMatch.suggestedCategoryIds.join(", ")}. Keep this in review if the opening beat is not precise enough.
              </p>
            )}
          </section>

          <details className="advanced-review">
            <summary>
              <span>Advanced edit</span>
              <small>only when detection is off</small>
            </summary>
            <div className="advanced-review-body">
              <section className="validation-section">
                <div className="validation-section-head">
                  <h3>System populated</h3>
                  <span>optional corrections</span>
                </div>
                <div className="validation-field-grid">
                  <label className="validation-field">
                    <span>Brand / Source</span>
                    <input value={sourceBrand} onChange={(event) => setSourceBrand(event.target.value)} />
                  </label>
                  <label className="validation-field">
                    <span>Product vertical</span>
                    <input value={productVertical} onChange={(event) => setProductVertical(event.target.value)} />
                  </label>
                  <div className="validation-field">
                    <span>Platform</span>
                    <div className="locked-field">Snap locked</div>
                  </div>
                  <label className="validation-field">
                    <span>Funnel fit</span>
                    <select value={funnel} onChange={(event) => setFunnel(event.target.value as Funnel | "")}>
                      <option value="">none</option>
                      {funnelOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="validation-field">
                    <span>Confidence</span>
                    <select value={confidence} onChange={(event) => setConfidence(event.target.value as ValidationConfidence)}>
                      <option value="strong">strong</option>
                      <option value="medium">medium</option>
                      <option value="needs-review">needs review</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="validation-section">
                <div className="validation-field-grid">
                  <label className="validation-field">
                    <span>Pattern optional</span>
                    <select
                      data-testid="validation-pattern-select"
                      value={pattern}
                      onChange={(event) => setPattern(event.target.value as HookPattern | "")}
                    >
                      <option value="">none</option>
                      {patternOrder.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="validation-field">
                    <span>Category optional</span>
                    <select
                      data-testid="validation-category-select"
                      value={category}
                      onChange={(event) => setCategory(event.target.value as HookCategory | "")}
                    >
                      <option value="">none</option>
                      {categoryOrder.map((item) => (
                        <option key={item} value={item}>
                          {categoryMeta[item].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="validation-field">
                    <span>Review state</span>
                    <select
                      data-testid="validation-status-select"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as ValidationStatus)}
                    >
                      <option value="inbox">Inbox / keep reviewing</option>
                      <option value="validated">Validated / add to hook</option>
                      <option value="rejected">Rejected / not a hook match</option>
                    </select>
                  </label>
                  <div className="validation-field wide">
                    <span>System tags</span>
                    <div className="auto-tag-readout" data-testid="validation-tags-input">
                      {autoTags.map((tag) => (
                        <b key={tag}>{tag}</b>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="first-three-panel">
                <div className="validation-section-head">
                  <h3>First 3 Seconds</h3>
                  <span>edit draft text</span>
                </div>
                <div className="evidence-grid">
                  <label className="validation-field">
                    <span>First frame</span>
                    <textarea value={firstThree.firstFrame} onChange={(event) => updateEvidence("firstFrame", event.target.value)} />
                  </label>
                  <label className="validation-field">
                    <span>Text / audio</span>
                    <textarea
                      value={firstThree.firstTextOrAudio}
                      onChange={(event) => updateEvidence("firstTextOrAudio", event.target.value)}
                    />
                  </label>
                  <label className="validation-field">
                    <span>First movement</span>
                    <textarea value={firstThree.firstMovement} onChange={(event) => updateEvidence("firstMovement", event.target.value)} />
                  </label>
                  <label className="validation-field">
                    <span>Attention mechanic</span>
                    <textarea
                      value={firstThree.attentionMechanic}
                      onChange={(event) => updateEvidence("attentionMechanic", event.target.value)}
                    />
                  </label>
                  <label className="validation-field wide">
                    <span>Why this match</span>
                    <textarea value={firstThree.matchingReason} onChange={(event) => updateEvidence("matchingReason", event.target.value)} />
                  </label>
                </div>
              </section>

              <section className="validation-section">
                <div className="validation-section-head">
                  <h3>Creative Scorecard</h3>
                  <span>{score}/10 average</span>
                </div>
                <div className="score-grid">
                  {scoreOrder.map((key) => (
                    <label key={key}>
                      <span>{scoreLabels[key]}</span>
                      <input min="1" max="10" type="range" value={scores[key]} onChange={(event) => updateScore(key, event.target.value)} />
                      <strong>{scores[key]}</strong>
                    </label>
                  ))}
                </div>
              </section>

              <label className="validation-field">
                <span>Reviewer notes</span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Only add notes when the draft misses nuance..."
                />
              </label>
            </div>
          </details>

          <div className="validation-actions">
            <button type="button" disabled={!decision} onClick={handleClear}>
              {savedState === "cleared" ? "Cleared" : "Clear saved"}
            </button>
            <button type="button" onClick={onExportDecisions}>
              Export JSON
            </button>
          </div>

          {selectedHook ? (
            <button className="validation-open-hook" type="button" onClick={() => onOpenHook(selectedHook.id)}>
              Open {selectedHook.displayName}
            </button>
          ) : (
            <p className="lead-copy">Keep this unassigned until the opening beat clearly matches a hook.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function getFirstThreeSecondAnalysis(match: (typeof mediaHookMatrix)[number]): FirstThreeSecondAnalysis {
  if (match.firstThreeSeconds) return match.firstThreeSeconds;
  const firstFrame = match.visualTraits[0] ?? "opening frame needs review";
  const firstSignal = match.scriptSignals[0] ?? "first text/audio needs review";

  if (match.fitConfidence === "gap") {
    return {
      firstFrame,
      firstTextOrAudio: firstSignal,
      attentionMechanic: "Not enough first-three-second evidence for a hook assignment.",
      matchingReason: "This source is useful, but assigning it to a hook would mislabel the opening beat until the first line/frame is reviewed.",
    };
  }

  return {
    firstFrame,
    firstTextOrAudio: firstSignal,
    attentionMechanic: `${firstFrame}; ${firstSignal}`,
    matchingReason:
      match.fitConfidence === "strong"
        ? "The first visual or text beat already performs the listed hook mechanic."
        : "The opening beat is usable, but the native pattern is more specific than the current hook taxonomy.",
  };
}

function AdBuilder({
  validationDecisions,
  onBack,
  onOpenHook,
}: {
  validationDecisions: DecisionStore;
  onBack: () => void;
  onOpenHook: (id: string) => void;
}) {
  const [intent, setIntent] = useState<IntentFilter>("All");
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [production, setProduction] = useState<ProductionTier | null>(null);
  const [selectedId, setSelectedId] = useState(hooks[0].id);

  const filtered = useMemo(() => {
    return hooks
      .filter((hook) => intent === "All" || hook.intent === intent)
      .filter((hook) => !funnel || hook.funnelFit.includes(funnel))
      .filter((hook) => !production || hook.productionTier === production)
      .sort((a, b) => b.effectiveness - a.effectiveness || a.displayName.localeCompare(b.displayName));
  }, [funnel, intent, production]);

  useEffect(() => {
    if (filtered.length && !filtered.some((hook) => hook.id === selectedId)) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selectedHook = filtered.find((hook) => hook.id === selectedId) ?? filtered[0] ?? null;
  const selectedEvidence = selectedHook ? getHookEvidenceExamples(selectedHook.id, validationDecisions) : [];

  function exportBrief() {
    if (!selectedHook) return;
    const brief = buildBrief(selectedHook, intent, funnel, production, selectedEvidence[0]);
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selectedHook.id}-ad-brief.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="builder-view">
      <header className="builder-header">
        <div className="brand-mark builder-logo">
          <span>ha</span>
        </div>
        <div>
          <h1>Hook Ad Builder</h1>
          <p>44 hooks · intent to blueprint to ad</p>
        </div>
        <button type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to gallery
        </button>
      </header>

      <div className="builder-layout">
        <aside className="builder-sidebar">
          <BuilderGroup title="Intent">
            <FilterButton active={intent === "All"} onClick={() => setIntent("All")}>
              All <small>{hooks.length}</small>
            </FilterButton>
            {intentLabels.map((item) => (
              <FilterButton key={item} active={intent === item} dot={intentColor(item)} onClick={() => setIntent(item)}>
                {item} <small>{hooks.filter((hook) => hook.intent === item).length}</small>
              </FilterButton>
            ))}
          </BuilderGroup>
          <BuilderGroup title="Funnel">
            {funnelOptions.map((item) => (
              <FilterButton key={item} active={funnel === item} onClick={() => setFunnel(funnel === item ? null : item)}>
                {item}
              </FilterButton>
            ))}
          </BuilderGroup>
          <BuilderGroup title="Production">
            {productionTiers.map((item) => (
              <FilterButton key={item} active={production === item} onClick={() => setProduction(production === item ? null : item)}>
                {item}
              </FilterButton>
            ))}
          </BuilderGroup>
          <p>Intent picks the creative lane: camera, lighting, script spine, and CTA style. Pick a lane, then a hook.</p>
        </aside>

        <section className="builder-hooks">
          <div className="section-title sticky-title">
            <h2>Hooks</h2>
            <span>{filtered.length} · top-rated first</span>
          </div>
          {selectedHook && (
            <div className="mobile-brief-summary">
              <BuilderBrief
                evidence={selectedEvidence}
                hook={selectedHook}
                intent={intent}
                funnel={funnel}
                production={production}
                onOpenHook={onOpenHook}
              />
            </div>
          )}
          <div className="builder-list">
            {filtered.map((hook) => (
              <div key={hook.id} className="builder-result-block">
                <button
                  className={classNames("builder-item", hook.id === selectedHook?.id && "active")}
                  type="button"
                  onClick={() => setSelectedId(hook.id)}
                >
                  <Poster hook={hook} compact />
                  <div>
                    <span style={{ color: intentColor(hook.intent) }}>
                      {hook.intent} · {hook.categoryLabel}
                    </span>
                    <strong>{hook.name}</strong>
                    <p>{hook.example}</p>
                    <small>
                      {(hook.effectiveness * 2).toFixed(1)}/10 · {hook.difficulty} · {hook.productionTier}
                    </small>
                  </div>
                </button>
                {hook.id === selectedHook?.id && (
                  <div className="mobile-brief">
                    <BuilderBrief
                      evidence={selectedEvidence}
                      hook={selectedHook}
                      intent={intent}
                      funnel={funnel}
                      production={production}
                      onOpenHook={onOpenHook}
                    />
                  </div>
                )}
              </div>
            ))}
            {!filtered.length && (
              <EmptyState
                title="No blueprint here"
                body="This combination has no seed hook yet. Clear one filter or add a matching hook in the local data file."
              />
            )}
          </div>
        </section>

        <aside className="brief-panel">
          <div className="brief-top">
            <h2>Ad Builder (AI)</h2>
            <button className="dark-button" type="button" onClick={exportBrief} disabled={!selectedHook}>
              Export Ad Brief <Download size={16} />
            </button>
          </div>
          {selectedHook ? (
            <BuilderBrief
              evidence={selectedEvidence}
              hook={selectedHook}
              intent={intent}
              funnel={funnel}
              production={production}
              onOpenHook={onOpenHook}
            />
          ) : (
            <EmptyState title="No brief selected" body="Choose a different filter mix to generate a brief." />
          )}
        </aside>
      </div>
    </main>
  );
}

function BuilderBrief({
  evidence,
  hook,
  intent,
  funnel,
  production,
  onOpenHook,
}: {
  evidence: HookEvidenceExample[];
  hook: Hook;
  intent: IntentFilter;
  funnel: Funnel | null;
  production: ProductionTier | null;
  onOpenHook: (id: string) => void;
}) {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [thumbnailMode, setThumbnailMode] = useState<ThumbnailMode>("Dramatic");
  const heroEvidence = evidence[0];
  const blueprint = buildBlueprint(hook, production, heroEvidence);
  const shots = buildShots(blueprint, heroEvidence);
  const scriptText = buildScriptText(hook, blueprint, heroEvidence);
  const prompt = buildThumbnailPrompt(hook, blueprint, thumbnailMode, heroEvidence);
  const testingPlan = buildTestingPlan(hook, heroEvidence);

  async function copyText(text: string, kind: "script" | "prompt") {
    await navigator.clipboard.writeText(text);
    if (kind === "script") {
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 1400);
    } else {
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1400);
    }
  }

  function exportThisBrief() {
    const brief = buildBrief(hook, intent, funnel, production, heroEvidence);
    const blob = new Blob([brief], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${hook.id}-ad-brief.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="brief-stack">
      <section className="brief-card hook-summary-card">
        <span className="builder-summary-eyebrow" style={{ color: intentColor(hook.intent) }}>
          {hook.intent} · {hook.categoryLabel}
        </span>
        <h3>{hook.name}</h3>
        <p className="brief-line">"{hook.example}"</p>
        <p>
          <strong>Why it works:</strong> {hook.description}
        </p>
      </section>

      <section className="brief-card evidence-card">
        <div className="brief-section-head">
          <h4>Creative Evidence</h4>
          <span>{evidence.length ? `${evidence.length} linked sources` : "no validated source"}</span>
        </div>
        {heroEvidence ? (
          <div className="evidence-brief">
            <MiniPoster video={heroEvidence.video} />
            <div>
              <span>{heroEvidence.status}</span>
              <h5>{heroEvidence.video.title}</h5>
              <p>{heroEvidence.firstThree.attentionMechanic}</p>
              <dl>
                <div>
                  <dt>First frame</dt>
                  <dd>{heroEvidence.firstThree.firstFrame}</dd>
                </div>
                <div>
                  <dt>Platform</dt>
                  <dd>{heroEvidence.decision?.platform ?? inferPlatform(heroEvidence.video, heroEvidence.mediaMatch)}</dd>
                </div>
                <div>
                  <dt>Confidence</dt>
                  <dd>{heroEvidence.decision?.confidence ?? heroEvidence.mediaMatch?.fitConfidence ?? "suggested"}</dd>
                </div>
                <div>
                  <dt>Quality</dt>
                  <dd>{heroEvidence.decision ? `${scoreAverage(heroEvidence.decision.scores)}/10` : "not scored"}</dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <p className="lead-copy">No validated source is attached to this hook yet. Use Inspiration to approve a first-three-second match.</p>
        )}
      </section>

      <section className="brief-card visual-blueprint-card">
        <h4>Visual Blueprint</h4>
        <dl className="blueprint-grid">
          <div>
            <dt>Camera:</dt>
            <dd>{blueprint.camera}</dd>
          </div>
          <div>
            <dt>Framing:</dt>
            <dd>{blueprint.framing}</dd>
          </div>
          <div>
            <dt>Energy:</dt>
            <dd>{blueprint.energy}</dd>
          </div>
          <div>
            <dt>Lighting:</dt>
            <dd>{blueprint.lighting}</dd>
          </div>
          <div>
            <dt>Environment:</dt>
            <dd>{blueprint.environment}</dd>
          </div>
          <div>
            <dt>Motion:</dt>
            <dd>{blueprint.motion}</dd>
          </div>
          <div>
            <dt>Expression:</dt>
            <dd>{blueprint.expression}</dd>
          </div>
          <div>
            <dt>Text Overlay:</dt>
            <dd>{blueprint.textOverlay}</dd>
          </div>
        </dl>
      </section>

      <section className="brief-card script-card">
        <div className="brief-section-head">
          <h4>Script</h4>
          <button type="button" onClick={() => copyText(scriptText, "script")}>
            {copiedScript ? "Copied" : "Copy"}
          </button>
        </div>
        <pre>{scriptText}</pre>
      </section>

      <section className="brief-card shot-card">
        <div className="brief-section-head">
          <h4>Shot Breakdown</h4>
          <span>{shots.length} shots · ~15s</span>
        </div>
        <ol className="shot-list">
          {shots.map((shot, index) => (
            <li key={shot.title}>
              <span>{index + 1}</span>
              <div>
                <strong>{shot.title}</strong>
                <small>{shot.setup}</small>
                <p>{shot.action}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="brief-card testing-card">
        <div className="brief-section-head">
          <h4>Testing Plan</h4>
          <span>{heroEvidence ? heroEvidence.status : "template"}</span>
        </div>
        <ul className="testing-list">
          {testingPlan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="brief-card thumbnail-card">
        <div className="brief-section-head">
          <h4>AI Thumbnail</h4>
          <div className="mode-toggle" aria-label="Thumbnail style">
            {thumbnailModes.map((mode) => (
              <button
                key={mode}
                className={classNames(mode === thumbnailMode && "active")}
                type="button"
                onClick={() => setThumbnailMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="thumbnail-grid">
          {[1, 2, 3].map((item) => (
            <div key={item} aria-label={`Thumbnail placeholder ${item}`}>
              <ImageIcon size={22} />
            </div>
          ))}
        </div>
        <details>
          <summary>Prompt ({thumbnailMode === "Dramatic" ? "Slightly dramatic" : thumbnailMode})</summary>
          <p>{prompt}</p>
        </details>
        <div className="thumbnail-actions">
          <button type="button">Generate 3 Thumbnails</button>
          <button type="button" onClick={() => copyText(prompt, "prompt")}>
            {copiedPrompt ? "Copied" : "Copy Prompt"}
          </button>
        </div>
      </section>

      <div className="brief-actions">
        <button type="button" onClick={() => onOpenHook(hook.id)}>
          Open full hook
        </button>
        <button type="button" onClick={exportThisBrief}>
          Export brief
        </button>
      </div>
    </div>
  );
}

function BuilderGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="builder-group">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function intentColor(intent: Intent) {
  const colors: Record<Intent, string> = {
    Curiosity: "#9d5cf5",
    Authority: "#4d78eb",
    Story: "#db5aa3",
    Urgency: "#ef5d65",
    Education: "#2aa36b",
    Contrast: "#f0b847",
    Exclusive: "#111111",
  };
  return colors[intent];
}

type ThumbnailMode = "Raw" | "Dramatic" | "Viral";

type BuilderBlueprint = {
  camera: string;
  framing: string;
  energy: string;
  lighting: string;
  environment: string;
  motion: string;
  expression: string;
  textOverlay: string;
  tone: string;
  pacing: string;
  ctaStyle: string;
};

type ShotStep = {
  title: string;
  setup: string;
  action: string;
};

const thumbnailModes: ThumbnailMode[] = ["Raw", "Dramatic", "Viral"];

function buildBlueprint(hook: Hook, production: ProductionTier | null, evidence?: HookEvidenceExample): BuilderBlueprint {
  const tier = production ?? hook.productionTier;
  const camera = hook.category === "Text" ? "screen first" : hook.category === "Visual" ? "phone camera" : "front selfie";
  const energy = hook.intent === "Urgency" ? "high" : hook.intent === "Story" ? "warm" : "low";
  const motion =
    evidence?.firstThree.firstMovement && !evidence.firstThree.firstMovement.includes("manual review")
      ? evidence.firstThree.firstMovement
      : hook.category === "Editing" || hook.category === "Visual"
        ? "quick move"
        : "static";
  const expression =
    hook.intent === "Authority"
      ? "calm certain"
      : hook.intent === "Story"
        ? "confessional"
        : hook.intent === "Urgency"
          ? "serious alert"
          : "curious serious";

  return {
    camera,
    framing: hook.intent === "Authority" ? "medium close" : "close up",
    energy,
    lighting: tier === "Studio" ? "soft key" : tier === "AI" ? "generated glow" : "dim",
    environment: evidence?.decision?.productVertical
      ? evidence.decision.productVertical.split("/")[0].trim().toLowerCase()
      : tier === "Studio"
        ? "studio desk"
        : tier === "AI"
          ? "surreal room"
          : "bedroom",
    motion,
    expression,
    textOverlay: hook.id === "curiosity-gap" ? "One thing 99% miss:" : `${hook.displayName.replace(/^The\s+/i, "")}:`,
    tone: hook.intent === "Authority" ? "assured precise" : hook.intent === "Urgency" ? "direct urgent" : "hushed conspiratorial",
    pacing: hook.intent === "Urgency" ? "fast cuts hard stop" : "slow build fast payoff",
    ctaStyle: hook.intent === "Education" ? "save-for-later" : hook.intent === "Authority" ? "proof-led invite" : "soft tease - 'more tomorrow'",
  };
}

function buildShots(blueprint: BuilderBlueprint, evidence?: HookEvidenceExample): ShotStep[] {
  const evidenceFrame = evidence?.firstThree.firstFrame;
  const firstAction = evidenceFrame
    ? `borrow the validated opening: ${evidenceFrame}`
    : `open cold, lock eyes to lens, deliver caption overlay "${blueprint.textOverlay}"`;
  return [
    {
      title: "Hook",
      setup: `${blueprint.camera} · ${blueprint.framing}`,
      action: firstAction,
    },
    {
      title: "Open Loop",
      setup: `${blueprint.camera} · ${blueprint.motion}`,
      action: `hold ${blueprint.expression}, keep ${blueprint.energy} energy`,
    },
    {
      title: "Build Tension",
      setup: `${blueprint.camera} · ${blueprint.motion}`,
      action: `hold ${blueprint.expression}, keep ${blueprint.energy} energy`,
    },
    {
      title: "Partial Reveal",
      setup: `${blueprint.camera} · ${blueprint.motion}`,
      action: `hold ${blueprint.expression}, keep ${blueprint.energy} energy`,
    },
    {
      title: "Payoff",
      setup: `${blueprint.camera} · ${blueprint.motion}`,
      action: `hold ${blueprint.expression}, keep ${blueprint.energy} energy`,
    },
    {
      title: "Soft Cta",
      setup: `${blueprint.camera} · close on face`,
      action: `soften expression, let the ${blueprint.ctaStyle.split(" - ")[0]} land`,
    },
  ];
}

function buildScriptText(hook: Hook, blueprint: BuilderBlueprint, evidence?: HookEvidenceExample) {
  const evidenceBlock = evidence
    ? `
Validated inspiration: ${evidence.video.title}
First-frame evidence: ${evidence.firstThree.firstFrame}
Attention mechanic: ${evidence.firstThree.attentionMechanic}
`
    : "";
  return `Hook: ${hook.name}
Opener line: "${hook.example}"
${evidenceBlock}

Tone: ${blueprint.tone}
Pacing: ${blueprint.pacing}
Text overlay: "${blueprint.textOverlay}"

Structure:
  → hook
  → open loop
  → build tension
  → partial reveal
  → payoff
  → soft cta

CTA style: ${blueprint.ctaStyle}`;
}

function buildThumbnailPrompt(hook: Hook, blueprint: BuilderBlueprint, mode: ThumbnailMode, evidence?: HookEvidenceExample) {
  const style =
    mode === "Raw"
      ? "raw phone selfie frame, natural texture"
      : mode === "Viral"
        ? "high contrast viral creator thumbnail, bold readable text, expressive face"
        : "slightly dramatic low-key creator thumbnail, tense expression, warm shadows";
  const reference = evidence ? ` Inspired by the validated source "${evidence.video.title}" with this opening mechanic: ${evidence.firstThree.attentionMechanic}.` : "";
  return `${style}. ${hook.name} for a vertical short-form ad. ${blueprint.camera}, ${blueprint.framing}, ${blueprint.environment}, ${blueprint.lighting} lighting. Overlay text: "${blueprint.textOverlay}".${reference}`;
}

function buildTestingPlan(hook: Hook, evidence?: HookEvidenceExample) {
  const platform = evidence?.decision?.platform ?? (evidence ? inferPlatform(evidence.video, evidence.mediaMatch) : lockedSnapPlatform);
  const firstFrame = evidence?.firstThree.firstFrame ?? "the strongest hook frame";
  return [
    `A/B first frame: validated opening (${firstFrame}) vs a cleaner product-first frame.`,
    `A/B text overlay: "${hook.caption}" vs a shorter 4-6 word curiosity line for ${platform}.`,
    `A/B pacing: one slow-build version and one hard-cut version using the same hook.`,
    `Hold the hook constant; only change the first visual, first line, or CTA so the result is interpretable.`,
  ];
}

function buildBrief(
  hook: Hook,
  intent: IntentFilter,
  funnel: Funnel | null,
  production: ProductionTier | null,
  evidence?: HookEvidenceExample,
) {
  const blueprint = buildBlueprint(hook, production, evidence);
  const shots = buildShots(blueprint, evidence);
  const scriptText = buildScriptText(hook, blueprint, evidence);
  const thumbnailPrompt = buildThumbnailPrompt(hook, blueprint, "Dramatic", evidence);
  const testingPlan = buildTestingPlan(hook, evidence);
  return `# ${hook.name} Ad Brief

Intent: ${intent}
Funnel: ${funnel ?? hook.funnelFit.join(", ")}
Production: ${production ?? hook.productionTier}
Evidence Source: ${evidence ? `${evidence.video.title} (${evidence.status})` : "No validated source attached"}

## First 3 Second Evidence
${evidence ? `- First frame: ${evidence.firstThree.firstFrame}
- Text/audio: ${evidence.firstThree.firstTextOrAudio}
- Movement: ${evidence.firstThree.firstMovement}
- Mechanic: ${evidence.firstThree.attentionMechanic}
- Why it matches: ${evidence.firstThree.matchingReason}` : "- Needs human validation in Inspiration."}

## Visual Blueprint
- Camera: ${blueprint.camera}
- Framing: ${blueprint.framing}
- Energy: ${blueprint.energy}
- Lighting: ${blueprint.lighting}
- Environment: ${blueprint.environment}
- Motion: ${blueprint.motion}
- Expression: ${blueprint.expression}
- Text Overlay: ${blueprint.textOverlay}

## Script
${scriptText}

## Why It Works
${hook.description}

## Shot Breakdown
${shots.map((shot, index) => `${index + 1}. ${shot.title}\n   ${shot.setup}\n   ${shot.action}`).join("\n")}

## AI Thumbnail Prompt
${thumbnailPrompt}

## Testing Plan
${testingPlan.map((item) => `- ${item}`).join("\n")}

## Vertical Rewrites
${hook.verticalExamples.map((example) => `### ${example.verticalName}\n"${example.script}"\n${example.visualDirection}`).join("\n\n")}

## When To Use
${hook.whenToUse.map((item) => `- ${item}`).join("\n")}

## Avoid When
${hook.whenNotToUse.map((item) => `- ${item}`).join("\n")}

## Tags
${hook.tags.map((tag) => `#${tag}`).join(" ")}
`;
}

function Footer() {
  return (
    <footer>
      <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        Back to top
      </button>
      <div className="footer-brand">
        <div className="brand-mark">
          <span>ha</span>
        </div>
        <strong>The Hook Atlas</strong>
        <p>44 hooks · patterns for the first 2 seconds</p>
        <small>Left/right navigate · ESC close</small>
      </div>
    </footer>
  );
}

export default App;
