export const CHANNELS = ["cold", "content", "paid", "community", "partnerships", "network"] as const;
export type ChannelId = typeof CHANNELS[number];
export const CHANNEL_LABELS: Record<ChannelId, string> = {
  cold: "Cold outreach", content: "Content and SEO", paid: "Paid ads", community: "Community and forums", partnerships: "Partnerships", network: "Founder network",
};
export const CHANNEL_BASE: Record<ChannelId, number> = { cold: .10, content: .08, paid: .12, community: .09, partnerships: .14, network: .16 };
