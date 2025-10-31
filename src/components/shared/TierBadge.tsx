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

const tierGradients = {
  Bronze: 'from-[#CD7F32] via-[#E8A87C] to-[#CD7F32]',
  Silver: 'from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0]',
  Gold: 'from-[#FFD700] via-[#FFED4E] to-[#FFD700]',
  Platinum: 'from-[#E5E4E2] via-[#F5F5F5] to-[#E5E4E2]',
  Diamond: 'from-[#B9F2FF] via-[#E0F9FF] to-[#B9F2FF]',
};

const tierTextColors = {
  Bronze: 'text-[#8B4513]',
  Silver: 'text-black',
  Gold: 'text-honey-dark',
  Platinum: 'text-black',
  Diamond: 'text-reflex-blue-900',
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
      <span className={`inline-flex items-center ${sizeClasses[size].container} rounded-full bg-cool-gray text-black/70 font-medium ${className}`}>
        <Trophy className={sizeClasses[size].icon} />
        {showLabel && <span className={sizeClasses[size].text}>Nessun Tier</span>}
      </span>
    );
  }

  const Icon = tierIcons[tier.tier_name as keyof typeof tierIcons] || Trophy;
  const gradient = tierGradients[tier.tier_name as keyof typeof tierGradients];
  const textColor = tierTextColors[tier.tier_name as keyof typeof tierTextColors];

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size].container} rounded-full bg-gradient-to-r ${gradient} ${textColor} font-bold shadow-md ${className}`}
    >
      <Icon className={sizeClasses[size].icon} />
      {showLabel && <span className={sizeClasses[size].text}>{tier.display_name}</span>}
    </span>
  );
}
