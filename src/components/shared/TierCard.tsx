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

const tierGradients = {
  Bronze: 'from-[#CD7F32] via-[#E8A87C] to-[#CD7F32]',
  Silver: 'from-[#C0C0C0] via-[#E8E8E8] to-[#C0C0C0]',
  Gold: 'from-[#FFD700] via-[#FFED4E] to-[#FFD700]',
  Platinum: 'from-[#E5E4E2] via-[#F5F5F5] to-[#E5E4E2]',
  Diamond: 'from-[#B9F2FF] via-[#E0F9FF] to-[#B9F2FF]',
};

const tierBgGradients = {
  Bronze: 'from-salmon-light to-rose',
  Silver: 'from-cool-gray-50 to-cool-gray-100',
  Gold: 'from-honey-light to-honey/40',
  Platinum: 'from-cool-gray-100 to-cool-gray-200',
  Diamond: 'from-sky-light to-sky/50',
};

export default function TierCard({ tier, isUnlocked, isCurrent }: TierCardProps) {
  const Icon = tierIcons[tier.tier_name as keyof typeof tierIcons] || Trophy;
  const gradient = tierGradients[tier.tier_name as keyof typeof tierGradients];
  const bgGradient = tierBgGradients[tier.tier_name as keyof typeof tierBgGradients];

  return (
    <div
      className={`relative bg-gradient-to-br ${bgGradient} rounded-xl p-6 border-2 transition-all ${
        isCurrent
          ? 'border-forest shadow-xl scale-105'
          : isUnlocked
          ? 'border-cool-gray-400 shadow-md'
          : 'border-cool-gray-300 opacity-60'
      }`}
    >
      {isCurrent && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1 bg-forest text-white px-2 py-1 rounded-full text-xs font-bold shadow-md">
            <CheckCircle className="w-3 h-3" />
            Tier Attuale
          </div>
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-4">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-8 h-8 text-white" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-black mb-1">{tier.display_name}</h3>
          <p className="text-sm font-inter font-medium text-black/70">{tier.points_required.toLocaleString('it-IT')} punti</p>
        </div>

        <p className="text-sm font-inter text-black/80 leading-relaxed">{tier.description}</p>

        {isUnlocked && !isCurrent && (
          <div className="flex items-center gap-1 text-forest text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Sbloccato
          </div>
        )}
      </div>
    </div>
  );
}
