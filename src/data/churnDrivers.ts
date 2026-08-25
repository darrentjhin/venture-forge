export const CHURN_DRIVERS = ["onboarding", "integration", "price", "reliability", "champion"] as const;
export type ChurnDriverId = typeof CHURN_DRIVERS[number];
export const CHURN_LABELS: Record<ChurnDriverId, string> = {
  onboarding: "Onboarding friction", integration: "A missing integration", price: "Price sensitivity", reliability: "Reliability and bugs", champion: "Champion turnover",
};
