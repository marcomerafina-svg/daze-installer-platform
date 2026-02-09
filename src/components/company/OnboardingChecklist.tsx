import { CheckCircle, Circle, Users, TrendingUp, Zap, Building2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: React.ComponentType<any>;
  color: string;
}

interface OnboardingChecklistProps {
  totalMembers: number;
  totalLeads: number;
  totalInstallations: number;
  hasCompanyInfo: boolean;
}

export default function OnboardingChecklist({
  totalMembers,
  totalLeads,
  totalInstallations,
  hasCompanyInfo
}: OnboardingChecklistProps) {
  const items: ChecklistItem[] = [
    {
      id: 'company-info',
      title: 'Completa il profilo aziendale',
      description: 'Aggiungi tutti i dati della tua azienda',
      completed: hasCompanyInfo,
      icon: Building2,
      color: 'blue'
    },
    {
      id: 'add-members',
      title: 'Aggiungi membri al team',
      description: 'Invita almeno un installatore',
      completed: totalMembers > 1,
      icon: Users,
      color: 'blue-alt'
    },
    {
      id: 'first-lead',
      title: 'Ricevi la prima lead',
      description: 'Aspetta che ti venga assegnata una lead',
      completed: totalLeads > 0,
      icon: Zap,
      color: 'honey'
    },
    {
      id: 'first-installation',
      title: 'Registra la prima installazione',
      description: 'Completa e registra un\'installazione',
      completed: totalInstallations > 0,
      icon: CheckCircle,
      color: 'forest'
    }
  ];

  const completedCount = items.filter(item => item.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  const getColorClasses = (color: string, completed: boolean) => {
    if (completed) {
      return {
        bg: 'bg-daze-forest/10',
        text: 'text-daze-forest',
        iconBg: 'bg-daze-forest/20',
        iconText: 'text-daze-forest',
        border: 'border-daze-forest/20'
      };
    }

    const colors: Record<string, any> = {
      blue: { bg: 'bg-daze-blue-light', text: 'text-daze-blue', iconBg: 'bg-daze-blue/20', iconText: 'text-daze-blue', border: 'border-daze-blue/20' },
      'blue-alt': { bg: 'bg-daze-blue-light/50', text: 'text-daze-blue', iconBg: 'bg-daze-blue/20', iconText: 'text-daze-blue', border: 'border-daze-blue/20' },
      honey: { bg: 'bg-daze-honey/10', text: 'text-daze-honey-dark', iconBg: 'bg-daze-honey/20', iconText: 'text-daze-honey-dark', border: 'border-daze-honey/20' },
      forest: { bg: 'bg-daze-forest/10', text: 'text-daze-forest', iconBg: 'bg-daze-forest/20', iconText: 'text-daze-forest', border: 'border-daze-forest/20' }
    };

    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-squircle border border-daze-gray p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-roobert font-bold text-daze-black">Primi Passi</h3>
          <p className="text-sm font-inter text-daze-black/70 mt-1">
            Completa questi obiettivi per iniziare al meglio
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-roobert font-bold text-daze-blue">{progress}%</div>
          <div className="text-xs font-inter text-daze-black/70">Completamento</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-daze-gray rounded-pill h-2">
          <div
            className="bg-daze-blue h-2 rounded-pill transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          const CheckIcon = item.completed ? CheckCircle : Circle;
          const colors = getColorClasses(item.color, item.completed);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border-2 transition-all ${colors.bg} ${colors.border} ${
                item.completed ? 'opacity-90' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${colors.iconText}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className={`font-roobert font-bold ${colors.text}`}>
                        {item.title}
                      </h4>
                      <p className="text-sm font-inter text-daze-black/70 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <CheckIcon
                      className={`w-6 h-6 flex-shrink-0 ${
                        item.completed ? 'text-daze-forest' : 'text-daze-gray'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {completedCount === items.length && (
        <div className="mt-6 p-4 bg-daze-forest/10 border-2 border-daze-forest/20 rounded-squircle">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-daze-forest/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-daze-forest" />
            </div>
            <div>
              <h4 className="font-roobert font-bold text-daze-black">Congratulazioni!</h4>
              <p className="text-sm font-inter text-daze-black/70">
                Hai completato tutti i primi passi. Continua così!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
