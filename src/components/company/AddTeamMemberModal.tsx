import { useState } from 'react';
import { X, User, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ITALIAN_REGIONS = [
  'Valle d\'Aosta',
  'Piemonte',
  'Liguria',
  'Lombardia',
  'Trentino-Alto Adige',
  'Veneto',
  'Friuli-Venezia Giulia',
  'Emilia-Romagna',
  'Toscana',
  'Umbria',
  'Marche',
  'Lazio',
  'Abruzzo',
  'Molise',
  'Campania',
  'Puglia',
  'Basilicata',
  'Calabria',
  'Sicilia',
  'Sardegna',
];

interface AddTeamMemberModalProps {
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface MemberData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  region: string;
}

export default function AddTeamMemberModal({ companyId, onClose, onSuccess }: AddTeamMemberModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [memberData, setMemberData] = useState<MemberData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    region: '',
  });

  const handleChange = (field: keyof MemberData, value: string) => {
    setMemberData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!memberData.first_name.trim() || !memberData.last_name.trim()) {
      setError('Nome e cognome sono obbligatori');
      return;
    }

    if (!memberData.email.trim() || !memberData.email.includes('@')) {
      setError('Email non valida');
      return;
    }

    if (!memberData.phone.trim()) {
      setError('Telefono è obbligatorio');
      return;
    }

    if (!memberData.region) {
      setError('Regione è obbligatoria');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Sessione non valida');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-test-installer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          firstName: memberData.first_name,
          lastName: memberData.last_name,
          email: memberData.email,
          phone: memberData.phone,
          region: memberData.region,
          companyId: companyId,
        }),
      });

      const responseText = await response.text();

      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error('Response was not valid JSON:', responseText);
        throw new Error(`Errore del server: ${response.status} ${response.statusText}`);
      }

      if (!response.ok || result.success === false) {
        console.error('Server error response:', result);
        throw new Error(result.error || `Errore durante la creazione del membro (HTTP ${response.status})`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating team member:', err);
      setError(err instanceof Error ? err.message : 'Errore durante la creazione del membro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Aggiungi Membro al Team</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome *
                </div>
              </label>
              <input
                type="text"
                value={memberData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mario"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Cognome *
                </div>
              </label>
              <input
                type="text"
                value={memberData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Rossi"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email *
              </div>
            </label>
            <input
              type="email"
              value={memberData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="mario.rossi@esempio.it"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Telefono *
              </div>
            </label>
            <input
              type="tel"
              value={memberData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+39 333 1234567"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Regione *
              </div>
            </label>
            <select
              value={memberData.region}
              onChange={(e) => handleChange('region', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleziona una regione</option>
              {ITALIAN_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Il nuovo membro riceverà un'email con le credenziali di accesso generate automaticamente.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creazione in corso...' : 'Aggiungi Membro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
