import { Badge } from "./badge";
import { TIER_CONFIG } from "@/lib/constants";

interface TierBadgeProps {
  tier: number;
}

export function TierBadge({ tier }: TierBadgeProps) {
  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG] || TIER_CONFIG[4];
  return <Badge color={config.color}>{config.label}</Badge>;
}
