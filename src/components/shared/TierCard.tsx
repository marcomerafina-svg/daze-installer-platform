import { Trophy, Star, Award, Crown, Gem, CheckCircle } from 'lucide-react';
import type { RewardsTier } from '../../types';

interface TierCardProps {
  tier: RewardsTier;
  isUnlocked: boolean;
  isCurrent?: boolean;
}

const tierIcons = {
  Bronze: Trophy,
  Silver: Star,
  Gold: Award,
  Platinum: Crown,
  Diamond: Gem,
};

const tierIconBg = {
  Bronze: 'bg-[#CD7F32]',
  Silver: 'bg-[#A0A0A0]',
  Gold: 'bg-[#D4A017]',
  Platinum: 'bg-[#8C8C8C]',
  Diamond: 'bg-[#5BB8D4]',
};

const tierCardBg = {
  Bronze: 'bg-daze-rose/30',
  Silver: 'bg-daze-gray/30',
  Gold: 'bg-daze-honey/10',
  Platinum: 'bg-daze-gray/20',
  Diamond: 'bg-daze-sky/20',
};

export default function TierCard({ tier, isUnlocked, isCurrent }: TierCardProps) {
  const Icon = tierIcons[tier.tier_name as keyof typeof tierIcons] || Trophy;
  const iconBg = tierIconBg[tier.tier_name as keyof typeof tierIconBg] || 'bg-daze-blue';
  const cardBg = tierCardBg[tier.tier_name as keyof typeof tierCardBg] || 'bg-daze-gray/10';

  return (
    <div
      className={`relative ${cardBg} rounded-squircle p-4 border-2 transition-all flex flex-col ${
        isCurrent
          ? 'border-daze-forest'
          : isUnlocked
          ? 'border-daze-gray'
          : 'border-daze-gray/50 opacity-60'
      }`}
    >
      {isCurrent && (
        <div className="flex justify-center mb-2">
          <div className="flex items-center gap-1 bg-daze-forest text-white px-2.5 py-0.5 rounded-pill text-xs font-roobert font-bold">
            <CheckCircle className="w-3 h-3" />
            Tier Attuale
          </div>
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-2 flex-1">
        <div className={`w-12 h-12 rounded-full ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div>
          <h3 className="text-base font-roobert font-bold text-daze-black leading-tight">{tier.display_name}</h3>
          <p className="text-xs font-inter font-medium text-daze-black/70 mt-0.5">{tier.points_required.toLocaleString('it-IT')} punti</p>
        </div>

        <p className="text-xs font-inter text-daze-black/60 leading-snug flex-1">{tier.description}</p>

        {isUnlocked && !isCurrent && (
          <div className="flex items-center gap-1 text-daze-forest text-xs font-roobert font-medium mt-auto">
            <CheckCircle className="w-3.5 h-3.5" />
            Sbloccato
          </div>
        )}
      </div>
    </div>
  );
}
