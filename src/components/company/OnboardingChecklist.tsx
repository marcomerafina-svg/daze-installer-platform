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
      color: 'purple'
    },
    {
      id: 'first-lead',
      title: 'Ricevi la prima lead',
      description: 'Aspetta che ti venga assegnata una lead',
      completed: totalLeads > 0,
      icon: Zap,
      color: 'orange'
    },
    {
      id: 'first-installation',
      title: 'Registra la prima installazione',
      description: 'Completa e registra un\'installazione',
      completed: totalInstallations > 0,
      icon: CheckCircle,
      color: 'green'
    }
  ];

  const completedCount = items.filter(item => item.completed).length;
  const progress = Math.round((completedCount / items.length) * 100);

  const getColorClasses = (color: string, completed: boolean) => {
    if (completed) {
      return {
        bg: 'bg-green-100',
        text: 'text-green-700',
        iconBg: 'bg-green-200',
        iconText: 'text-green-700',
        border: 'border-green-200'
      };
    }

    const colors: Record<string, any> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600', border: 'border-blue-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', iconBg: 'bg-purple-100', iconText: 'text-purple-600', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600', border: 'border-orange-200' },
      green: { bg: 'bg-green-50', text: 'text-green-700', iconBg: 'bg-green-100', iconText: 'text-green-600', border: 'border-green-200' }
    };

    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Primi Passi</h3>
          <p className="text-sm font-inter text-gray-600 mt-1">
            Completa questi obiettivi per iniziare al meglio
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{progress}%</div>
          <div className="text-xs text-gray-500">Completamento</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all duration-500"
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
              className={`p-4 rounded-lg border-2 transition-all ${colors.bg} ${colors.border} ${
                item.completed ? 'opacity-90' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${colors.iconText}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className={`font-semibold ${colors.text}`}>
                        {item.title}
                      </h4>
                      <p className="text-sm font-inter text-gray-600 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <CheckIcon
                      className={`w-6 h-6 flex-shrink-0 ${
                        item.completed ? 'text-green-600' : 'text-gray-300'
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
        <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h4 className="font-bold text-green-900">Congratulazioni!</h4>
              <p className="text-sm text-green-700">
                Hai completato tutti i primi passi. Continua così!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
