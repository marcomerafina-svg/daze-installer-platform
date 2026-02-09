import { useState } from 'react';
import { X, CheckCircle, Users, Award, TrendingUp, Zap, Building2, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';

interface CompanyOnboardingModalProps {
  companyId: string;
  companyName: string;
  currentStep?: number;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    id: 1,
    title: 'Benvenuto su Daze',
    icon: Building2,
    color: 'blue',
    content: {
      heading: 'Benvenuto nella tua piattaforma di gestione lead e installazioni',
      description: 'Siamo felici di averti a bordo! Questa guida rapida ti aiuterà a scoprire tutte le funzionalità della piattaforma e a iniziare subito a gestire il tuo business in modo efficiente.',
      features: [
        'Gestione centralizzata di lead e installazioni',
        'Sistema di assegnazione automatica delle lead al tuo team',
        'Tracciamento punti e premi per incentivare le performance',
        'Dashboard in tempo reale con statistiche dettagliate',
      ]
    }
  },
  {
    id: 2,
    title: 'Dashboard Aziendale',
    icon: TrendingUp,
    color: 'green',
    content: {
      heading: 'Il centro di controllo della tua azienda',
      description: 'La dashboard ti offre una vista completa di tutte le metriche chiave del tuo business. Monitora le performance del team, le lead in pipeline e le installazioni completate.',
      features: [
        'Statistiche in tempo reale su membri, lead e installazioni',
        'Tassi di conversione e performance del team',
        'Visualizzazione del tier attuale e punti accumulati',
        'Alert e notifiche per eventi importanti',
      ]
    }
  },
  {
    id: 3,
    title: 'Gestione Team',
    icon: Users,
    color: 'purple',
    content: {
      heading: 'Aggiungi e gestisci il tuo team',
      description: 'Invita i tuoi installatori e assegna loro ruoli specifici. Ogni membro del team può ricevere lead, registrare installazioni e accumulare punti.',
      features: [
        'Aggiungi installatori con diversi livelli di permessi',
        'Assegna lead internamente ai membri del team',
        'Monitora le performance individuali di ogni installatore',
        'Gestisci ruoli: Owner, Admin, Installatore',
      ]
    }
  },
  {
    id: 4,
    title: 'Sistema Lead',
    icon: Zap,
    color: 'orange',
    content: {
      heading: 'Ricevi e gestisci le lead automaticamente',
      description: 'Le lead vengono assegnate alla tua azienda in base a criteri geografici e disponibilità. Puoi poi assegnarle ai membri del team e seguirne il progresso.',
      features: [
        'Ricezione automatica di lead qualificate',
        'Assegnazione interna ai membri del team',
        'Tracciamento dello stato: da contattare, in trattativa, vinta/persa',
        'Notifiche in tempo reale per nuove lead',
      ]
    }
  },
  {
    id: 5,
    title: 'Registrazione Installazioni',
    icon: CheckCircle,
    color: 'cyan',
    content: {
      heading: 'Registra le installazioni e accumula punti',
      description: 'Ogni installazione completata va registrata nella piattaforma inserendo il numero seriale del prodotto. Questo permette di tracciare il lavoro e accumulare punti.',
      features: [
        'Registrazione semplice con scan del codice seriale',
        'Caricamento foto dell\'installazione',
        'Sistema di approvazione per installazioni auto-dichiarate',
        'Accumulo automatico di punti per ogni prodotto installato',
      ]
    }
  },
  {
    id: 6,
    title: 'Sistema Punti e Premi',
    icon: Award,
    color: 'yellow',
    content: {
      heading: 'Guadagna premi con le tue installazioni',
      description: 'Ogni prodotto installato vale punti. Accumula punti per salire di tier e sbloccare vantaggi esclusivi e riconoscimenti.',
      features: [
        'Punti per ogni tipo di prodotto installato',
        'Sistema a tier: Bronze, Silver, Gold, Platinum, Diamond',
        'Vantaggi crescenti man mano che sali di livello',
        'Classifica aziendale per competere con altre aziende',
      ]
    }
  }
];

const STEP_COLORS = {
  blue: 'bg-daze-blue-light text-daze-blue border-daze-blue/20',
  green: 'bg-daze-forest/10 text-daze-forest border-daze-forest/20',
  purple: 'bg-daze-blue-light text-daze-blue border-daze-blue/20',
  orange: 'bg-daze-honey/10 text-daze-honey-dark border-daze-honey/20',
  cyan: 'bg-daze-sky/20 text-daze-blue border-daze-sky/30',
  yellow: 'bg-daze-honey/10 text-daze-honey-dark border-daze-honey/20',
};

export default function CompanyOnboardingModal({
  companyId,
  companyName,
  currentStep = 0,
  onComplete,
  onSkip
}: CompanyOnboardingModalProps) {
  const [step, setStep] = useState(currentStep || 1);
  const [loading, setLoading] = useState(false);

  const currentStepData = STEPS[step - 1];
  const Icon = currentStepData.icon;
  const colorClass = STEP_COLORS[currentStepData.color as keyof typeof STEP_COLORS];

  const updateOnboardingStep = async (newStep: number) => {
    try {
      const updates: any = { onboarding_step: newStep };

      if (newStep === 1 && currentStep === 0) {
        updates.onboarding_started_at = new Date().toISOString();
      }

      await supabase
        .from('installation_companies')
        .update(updates)
        .eq('id', companyId);
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    }
  };

  const handleNext = async () => {
    if (step < STEPS.length) {
      const nextStep = step + 1;
      setStep(nextStep);
      await updateOnboardingStep(nextStep);
    } else {
      await handleComplete();
    }
  };

  const handlePrevious = async () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      await updateOnboardingStep(prevStep);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await supabase
        .from('installation_companies')
        .update({
          onboarding_completed: true,
          onboarding_step: 99,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await supabase
        .from('installation_companies')
        .update({
          onboarding_completed: true,
          onboarding_skipped: true,
          onboarding_step: 99,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', companyId);

      onSkip();
    } catch (error) {
      console.error('Error skipping onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-squircle max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="relative bg-daze-blue px-8 py-6 text-white">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold">{companyName}</h2>
          <p className="text-white/70 text-sm mt-1">Configurazione iniziale</p>

          <div className="flex items-center gap-2 mt-6">
            {STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`flex-1 h-2 rounded-full transition-all ${
                  idx + 1 <= step ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-white/70 mt-2">
            Step {step} di {STEPS.length}
          </p>
        </div>

        <div className="p-8 overflow-y-auto max-h-[calc(90vh-240px)]">
          <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl border-2 ${colorClass} mb-6`}>
            <Icon className="w-6 h-6" />
            <span className="font-semibold">{currentStepData.title}</span>
          </div>

          <h3 className="text-2xl font-bold text-daze-black mb-4">
            {currentStepData.content.heading}
          </h3>

          <p className="text-daze-black/70 font-inter text-lg mb-6 leading-relaxed">
            {currentStepData.content.description}
          </p>

          <div className="bg-daze-gray/10 rounded-squircle p-6 border border-daze-gray">
            <h4 className="font-semibold text-daze-black mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-daze-forest" />
              Funzionalità Principali
            </h4>
            <ul className="space-y-3 font-inter">
              {currentStepData.content.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-daze-black/70">
                  <div className="w-6 h-6 rounded-full bg-daze-blue-light text-daze-blue flex items-center justify-center text-sm font-semibold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-daze-gray/10 border-t border-daze-gray px-8 py-5 flex items-center justify-between">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              disabled={loading}
            >
              Salta tour
            </Button>
          </div>

          <div className="flex gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
                iconPosition="left"
                onClick={handlePrevious}
                disabled={loading}
              >
                Indietro
              </Button>
            )}

            <Button
              variant="primaryBlack"
              size="sm"
              onClick={handleNext}
              disabled={loading}
              icon={step === STEPS.length ? <CheckCircle className="w-5 h-5" /> : undefined}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Caricamento...
                </>
              ) : step === STEPS.length ? (
                'Completa Tour'
              ) : (
                <>
                  Avanti
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
