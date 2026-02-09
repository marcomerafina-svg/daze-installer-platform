import { useState } from 'react';
import { X, Building2, User, Mail, Phone, MapPin, FileText, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';

interface CreateCompanyModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface CompanyData {
  company_name: string;
  vat_number: string;
  business_name: string;
  address: string;
  city: string;
  province: string;
  zip_code: string;
  phone: string;
  email: string;
}

interface OwnerData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
}

export default function CreateCompanyModal({ onClose, onSuccess }: CreateCompanyModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [companyData, setCompanyData] = useState<CompanyData>({
    company_name: '',
    vat_number: '',
    business_name: '',
    address: '',
    city: '',
    province: '',
    zip_code: '',
    phone: '',
    email: '',
  });

  const [ownerData, setOwnerData] = useState<OwnerData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleCompanyChange = (field: keyof CompanyData, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleOwnerChange = (field: keyof OwnerData, value: string) => {
    setOwnerData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!companyData.company_name.trim()) {
      setError('Il nome azienda è obbligatorio');
      return false;
    }
    if (!companyData.email.trim() || !companyData.email.includes('@')) {
      setError('Email azienda non valida');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!ownerData.first_name.trim() || !ownerData.last_name.trim()) {
      setError('Nome e cognome owner sono obbligatori');
      return false;
    }
    if (!ownerData.email.trim() || !ownerData.email.includes('@')) {
      setError('Email owner non valida');
      return false;
    }
    if (!ownerData.password || ownerData.password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setLoading(true);
    setError('');

    try {
      // Usa supabase.functions.invoke() che gestisce correttamente l'autenticazione
      const { data: result, error: invokeError } = await supabase.functions.invoke('create-company', {
        body: {
          company: companyData,
          owner: ownerData,
        },
      });

      console.log('Function result:', result);
      console.log('Function error:', invokeError);

      if (invokeError) {
        throw new Error(invokeError.message || 'Errore nella creazione dell\'azienda');
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      console.log('Azienda creata con successo:', result);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating company:', err);
      setError(err.message || 'Errore durante la creazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Crea Nuova Azienda</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 ? 'Step 1: Dati Azienda' : 'Step 2: Dati Owner'}
            </p>
          </div>
          <Button
            variant="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 font-inter">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Azienda *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={companyData.company_name}
                    onChange={(e) => handleCompanyChange('company_name', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Es: Installazioni Milano SRL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partita IVA
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={companyData.vat_number}
                      onChange={(e) => handleCompanyChange('vat_number', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="12345678901"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ragione Sociale
                  </label>
                  <input
                    type="text"
                    value={companyData.business_name}
                    onChange={(e) => handleCompanyChange('business_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nome legale"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Indirizzo
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={companyData.address}
                    onChange={(e) => handleCompanyChange('address', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Via Roma 123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Città
                  </label>
                  <input
                    type="text"
                    value={companyData.city}
                    onChange={(e) => handleCompanyChange('city', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Milano"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={companyData.province}
                    onChange={(e) => handleCompanyChange('province', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="MI"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CAP
                </label>
                <input
                  type="text"
                  value={companyData.zip_code}
                  onChange={(e) => handleCompanyChange('zip_code', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="20121"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+39 02 1234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => handleCompanyChange('email', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="info@azienda.it"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Crea l'account per il proprietario dell'azienda. Riceverà una email con le credenziali di accesso.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={ownerData.first_name}
                      onChange={(e) => handleOwnerChange('first_name', e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mario"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    value={ownerData.last_name}
                    onChange={(e) => handleOwnerChange('last_name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={ownerData.email}
                    onChange={(e) => handleOwnerChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="owner@azienda.it"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefono
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={ownerData.phone}
                    onChange={(e) => handleOwnerChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+39 333 1234567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={ownerData.password}
                    onChange={(e) => handleOwnerChange('password', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Min. 8 caratteri"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  La password deve essere di almeno 8 caratteri
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between">
          {step === 1 ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Annulla
              </Button>
              <Button variant="primaryBlack" size="sm" onClick={handleNext}>
                Avanti
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" size="sm" onClick={() => setStep(1)} disabled={loading}>
                Indietro
              </Button>
              <Button
                variant="primaryBlack"
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creazione...
                  </>
                ) : (
                  'Crea Azienda'
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
