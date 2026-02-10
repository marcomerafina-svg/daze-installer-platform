import { Trophy, Star, Award, Crown, Gem } from 'lucide-react';
import type { RewardsTier } from '../../types';

interface TierBadgeProps {
  tier?: RewardsTier;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const tierIcons = {
  Bronze: Trophy,
  Silver: Star,
  Gold: Award,
  Platinum: Crown,
  Diamond: Gem,
};

const tierBg = {
  Bronze: 'bg-[#CD7F32]',
  Silver: 'bg-[#A0A0A0]',
  Gold: 'bg-[#D4A017]',
  Platinum: 'bg-[#6B6B6B]',
  Diamond: 'bg-[#5BB8D4]',
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-1 gap-1',
    icon: 'w-3 h-3',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5 gap-2',
    icon: 'w-4 h-4',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 gap-2',
    icon: 'w-5 h-5',
    text: 'text-base',
  },
};

export default function TierBadge({
  tier,
  size = 'md',
  showLabel = true,
  className = ''
}: TierBadgeProps) {
  if (!tier) {
    return (
      <span className={`inline-flex items-center ${sizeClasses[size].container} rounded-pill bg-daze-gray text-daze-black/70 font-medium ${className}`}>
        <Trophy className={sizeClasses[size].icon} />
        {showLabel && <span className={sizeClasses[size].text}>Nessun Tier</span>}
      </span>
    );
  }

  const Icon = tierIcons[tier.tier_name as keyof typeof tierIcons] || Trophy;
  const bgColor = tierBg[tier.tier_name as keyof typeof tierBg] || 'bg-daze-blue';

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size].container} rounded-pill ${bgColor} text-white font-bold ${className}`}
    >
      <Icon className={sizeClasses[size].icon} />
      {showLabel && <span className={sizeClasses[size].text}>{tier.display_name}</span>}
    </span>
  );
}
