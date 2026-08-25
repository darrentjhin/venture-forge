export const FEATURES = ["automation", "analytics", "integrations", "mobile", "collaboration", "compliance", "whiteLabel", "ai"] as const;
export type FeatureId = typeof FEATURES[number];
export const FEATURE_LABELS: Record<FeatureId, string> = {
  automation: "Automation engine", analytics: "Analytics dashboard", integrations: "Integrations hub", mobile: "Mobile app",
  collaboration: "Real-time collaboration", compliance: "Compliance and audit trail", whiteLabel: "White-label mode", ai: "AI assistant",
};
