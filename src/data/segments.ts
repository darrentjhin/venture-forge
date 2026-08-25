export const SEGMENTS = ["solo", "agency", "midmarket", "enterprise", "developers"] as const;
export type SegmentId = typeof SEGMENTS[number];
export const SEGMENT_LABELS: Record<SegmentId, string> = {
  solo: "Solo freelancers",
  agency: "Boutique agencies",
  midmarket: "Mid-market ops teams",
  enterprise: "Enterprise IT",
  developers: "Indie developers",
};
