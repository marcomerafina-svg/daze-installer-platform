import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, ChevronLeft, ChevronRight, User, Package, Camera, FileCheck, AlertCircle, CheckCircle2, Upload, Trash2 } from 'lucide-react';
import { Product, SerialParseResult } from '../../types';
import { parseSerial, validateSerialFormat } from '../../lib/serialParser';
import Button from '../shared/Button';

interface RegisterInstallationModalProps {
  installerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SerialInput {
  id: string;
  value: string;
  parseResult?: SerialParseResult;
  validating: boolean;
}

interface CustomerData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  installationDate: string;
  notes: string;
}

interface PhotoFile {
  id: string;
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  url?: string;
}

export default function RegisterInstallationModal({ installerId, onClose, onSuccess }: RegisterInstallationModalProps) {
  const [step, setStep] = useState(1);
  const [customerData, setCustomerData] = useState<CustomerData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    installationDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [serials, setSerials] = useState<SerialInput[]>([
    { id: '1', value: '', validating: false }
  ]);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (data) setProducts(data);
  };

  const validateSerial = async (serialInput: SerialInput) => {
    const trimmedValue = serialInput.value.trim().toUpperCase();
    if (!trimmedValue) return;

    const formatCheck = validateSerialFormat(trimmedValue);
    if (!formatCheck.isValid) {
      setSerials(prev =>
        prev.map(s =>
          s.id === serialInput.id
            ? { ...s, parseResult: { isValid: false, error: formatCheck.error }, validating: false }
            : s
        )
      );
      return;
    }

    setSerials(prev =>
      prev.map(s => (s.id === serialInput.id ? { ...s, validating: true } : s))
    );

    const { data: existingSerial } = await supabase
      .from('wallbox_serials')
      .select('id')
      .eq('serial_code', trimmedValue)
      .maybeSingle();

    if (existingSerial) {
      setSerials(prev =>
        prev.map(s =>
          s.id === serialInput.id
            ? { ...s, parseResult: { isValid: false, error: 'Seriale già registrato' }, validating: false }
            : s
        )
      );
      return;
    }

    const parseResult = await parseSerial(trimmedValue, products);
    setSerials(prev =>
      prev.map(s =>
        s.id === serialInput.id ? { ...s, parseResult, validating: false } : s
      )
    );
  };

  const handleSerialChange = (id: string, value: string) => {
    setSerials(prev =>
      prev.map(s => (s.id === id ? { ...s, value, parseResult: undefined } : s))
    );
    setError('');
  };

  const addSerialInput = () => {
    setSerials(prev => [...prev, { id: Date.now().toString(), value: '', validating: false }]);
  };

  const removeSerialInput = (id: string) => {
    if (serials.length > 1) {
      setSerials(prev => prev.filter(s => s.id !== id));
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      setError('Massimo 5 foto per installazione');
      return;
    }

    const newPhotos: PhotoFile[] = files.map(file => ({
      id: Date.now().toString() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const canProceedToStep2 = () => {
    return (
      customerData.firstName.trim() &&
      customerData.lastName.trim() &&
      customerData.phone.trim() &&
      customerData.installationDate
    );
  };

  const canProceedToStep3 = () => {
    const validSerials = serials.filter(s => s.value.trim() && s.parseResult?.isValid);
    return validSerials.length > 0;
  };

  const uploadPhotos = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const photo of photos) {
      if (photo.uploaded && photo.url) {
        uploadedUrls.push(photo.url);
        continue;
      }

      const fileExt = photo.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
      const filePath = `${installerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('installation-photos')
        .upload(filePath, photo.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data } = supabase.storage
        .from('installation-photos')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        uploadedUrls.push(filePath);
      }
    }

    return uploadedUrls;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const photoUrls = photos.length > 0 ? await uploadPhotos() : [];

      const validSerials = serials.filter(s => s.value.trim() && s.parseResult?.isValid);
      const serialsToInsert = validSerials.map(s => ({
        lead_id: null,
        serial_code: s.value.trim().toUpperCase(),
        product_id: s.parseResult?.product?.id,
        year: s.parseResult?.year,
        production_number: s.parseResult?.production_number,
        installer_id: installerId,
        customer_first_name: customerData.firstName.trim(),
        customer_last_name: customerData.lastName.trim(),
        customer_phone: customerData.phone.trim(),
        customer_email: customerData.email.trim() || null,
        customer_address: customerData.address.trim() || null,
        installation_date: customerData.installationDate,
        installation_notes: customerData.notes.trim() || null,
        source_type: 'self_reported',
        approval_status: 'pending',
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
      }));

      const { error: insertError } = await supabase
        .from('wallbox_serials')
        .insert(serialsToInsert);

      if (insertError) throw insertError;

      onSuccess();
    } catch (err: any) {
      console.error('Error saving installation:', err);
      setError('Errore durante il salvataggio. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-daze-black/70 mb-2">
            Nome Cliente <span className="text-daze-salmon-dark">*</span>
          </label>
          <input
            type="text"
            value={customerData.firstName}
            onChange={(e) => setCustomerData({ ...customerData, firstName: e.target.value })}
            className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
            placeholder="Mario"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-daze-black/70 mb-2">
            Cognome Cliente <span className="text-daze-salmon-dark">*</span>
          </label>
          <input
            type="text"
            value={customerData.lastName}
            onChange={(e) => setCustomerData({ ...customerData, lastName: e.target.value })}
            className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
            placeholder="Rossi"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-daze-black/70 mb-2">
          Telefono <span className="text-daze-salmon-dark">*</span>
        </label>
        <input
          type="tel"
          value={customerData.phone}
          onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
          className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
          placeholder="+39 333 1234567"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-daze-black/70 mb-2">
          Email
        </label>
        <input
          type="email"
          value={customerData.email}
          onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
          className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
          placeholder="mario.rossi@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-daze-black/70 mb-2">
          Indirizzo Installazione
        </label>
        <input
          type="text"
          value={customerData.address}
          onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
          className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
          placeholder="Via Roma 123, Milano"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-daze-black/70 mb-2">
          Data Installazione <span className="text-daze-salmon-dark">*</span>
        </label>
        <input
          type="date"
          value={customerData.installationDate}
          max={new Date().toISOString().split('T')[0]}
          onChange={(e) => setCustomerData({ ...customerData, installationDate: e.target.value })}
          className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-daze-black/70 mb-2">
          Note Installazione
        </label>
        <textarea
          value={customerData.notes}
          onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 border border-daze-gray rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border"
          placeholder="Eventuali note sull'installazione..."
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="bg-daze-blue-light border border-daze-blue/20 rounded-squircle p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-daze-blue flex-shrink-0 mt-0.5" />
          <p className="text-sm text-daze-black/70">
            Inserisci i numeri di seriale delle wallbox installate. Il sistema riconoscerà automaticamente il prodotto.
          </p>
        </div>
      </div>

      {serials.map((serial, index) => (
        <div key={serial.id} className="border border-daze-gray rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <label className="block text-sm font-medium text-daze-black/70">
              Seriale #{index + 1}
            </label>
            {serials.length > 1 && (
              <button
                onClick={() => removeSerialInput(serial.id)}
                className="p-1 text-daze-salmon-dark hover:bg-daze-salmon/10 rounded transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <input
            type="text"
            value={serial.value}
            onChange={(e) => handleSerialChange(serial.id, e.target.value)}
            onBlur={() => serial.value.trim() && validateSerial(serial)}
            placeholder="Es: 25DT0101143"
            maxLength={11}
            className={`w-full px-4 py-3 border rounded-xl outline-none focus:ring-0 focus:border-daze-blue transition-all text-daze-black font-inter placeholder:text-daze-border ${
              serial.parseResult?.isValid === false
                ? 'border-daze-salmon'
                : serial.parseResult?.isValid === true
                ? 'border-daze-forest'
                : 'border-daze-gray'
            }`}
          />
          {serial.validating && (
            <p className="mt-2 text-sm text-daze-black/70">Validazione in corso...</p>
          )}
          {serial.parseResult && !serial.validating && (
            <div className="mt-2">
              {serial.parseResult.isValid ? (
                <div className="flex items-start gap-2 text-daze-forest bg-daze-forest/10 p-3 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{serial.parseResult.product?.name}</p>
                    <p className="text-xs mt-1">
                      Anno: {serial.parseResult.year} | Progressivo: {serial.parseResult.production_number}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-daze-salmon-dark text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{serial.parseResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addSerialInput}
        className="w-full py-3 border-2 border-dashed border-daze-gray rounded-xl text-daze-black/70 hover:border-daze-blue hover:text-daze-blue transition-all flex items-center justify-center gap-2"
      >
        <Package className="w-5 h-5" />
        <span>Aggiungi altro seriale</span>
      </button>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="bg-daze-honey/10 border border-daze-honey/20 rounded-squircle p-4">
        <div className="flex gap-3">
          <Camera className="w-5 h-5 text-daze-honey-dark flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-daze-black mb-1">Foto Installazione (Opzionale)</p>
            <p className="text-sm text-daze-black/70">
              Carica fino a 5 foto dell'installazione. Le foto aiutano nella verifica da parte dell'admin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-video rounded-xl overflow-hidden border-2 border-daze-gray">
            <img src={photo.preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(photo.id)}
              className="absolute top-2 right-2 p-1.5 bg-daze-salmon text-white rounded-lg hover:bg-daze-salmon-dark transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        {photos.length < 5 && (
          <label className="aspect-video rounded-xl border-2 border-dashed border-daze-gray hover:border-daze-blue transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-daze-black/70 hover:text-daze-blue">
            <Upload className="w-8 h-8" />
            <span className="text-sm font-medium">Carica Foto</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/heic"
              multiple
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>
        )}
      </div>

      {photos.length === 0 && (
        <p className="text-sm text-daze-black/60 text-center">
          Puoi saltare questo passaggio e aggiungere foto in seguito
        </p>
      )}
    </div>
  );

  const renderStep4 = () => {
    const validSerials = serials.filter(s => s.value.trim() && s.parseResult?.isValid);
    const totalPoints = validSerials.reduce((sum, s) => sum + (s.parseResult?.product?.points || 0), 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-daze-blue rounded-xl">
            <FileCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-roobert font-bold text-daze-black">Riepilogo Installazione</h3>
        </div>

        <div className="rounded-squircle border border-daze-gray p-5 space-y-4">
          <div>
            <h4 className="text-xs font-roobert font-bold text-daze-black/60 uppercase tracking-wide mb-3">Cliente</h4>
            <p className="text-base font-roobert font-bold text-daze-black mb-1">
              {customerData.firstName} {customerData.lastName}
            </p>
            <div className="space-y-1 text-sm font-inter text-daze-black/70">
              <p>{customerData.phone}</p>
              {customerData.email && <p>{customerData.email}</p>}
              {customerData.address && <p>{customerData.address}</p>}
              <p>Data: {new Date(customerData.installationDate).toLocaleDateString('it-IT')}</p>
            </div>
          </div>

          <div className="border-t border-daze-gray pt-4">
            <h4 className="text-xs font-roobert font-bold text-daze-black/60 uppercase tracking-wide mb-3">
              Prodotti Installati ({validSerials.length})
            </h4>
            <div className="space-y-0">
              {validSerials.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-daze-gray/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-daze-black">{s.parseResult?.product?.name}</p>
                    <p className="text-xs font-mono text-daze-black/60">{s.value.toUpperCase()}</p>
                  </div>
                  <span className="text-sm font-roobert font-bold text-daze-blue">
                    {s.parseResult?.product?.points || 0} pt
                  </span>
                </div>
              ))}
            </div>
          </div>

          {photos.length > 0 && (
            <div className="border-t border-daze-gray pt-4">
              <h4 className="text-xs font-roobert font-bold text-daze-black/60 uppercase tracking-wide mb-3">
                Foto ({photos.length})
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <img
                    key={photo.id}
                    src={photo.preview}
                    alt="Preview"
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-daze-honey/10 border border-daze-honey/20 rounded-squircle p-4">
          <div className="flex items-center gap-3 text-daze-honey-dark">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-roobert font-medium">Punti in Attesa di Approvazione</p>
              <p className="text-xs font-inter mt-1">
                I tuoi <span className="font-bold">{totalPoints} punti</span> saranno confermati dopo la verifica dell'admin
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-squircle max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-daze-gray px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-daze-black">Registra Installazione</h2>
            <Button variant="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= s
                      ? 'bg-daze-blue text-white'
                      : 'bg-daze-gray text-daze-black/40'
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded transition-all ${
                      step > s ? 'bg-daze-blue' : 'bg-daze-gray'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-2 text-xs font-medium">
            <span className={step >= 1 ? 'text-daze-blue' : 'text-daze-black/40'}>Cliente</span>
            <span className={step >= 2 ? 'text-daze-blue' : 'text-daze-black/40'}>Seriali</span>
            <span className={step >= 3 ? 'text-daze-blue' : 'text-daze-black/40'}>Foto</span>
            <span className={step >= 4 ? 'text-daze-blue' : 'text-daze-black/40'}>Conferma</span>
          </div>
        </div>

        <div className="p-6 font-inter">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {error && (
            <div className="mt-4 p-3 bg-daze-salmon/10 border border-daze-salmon/20 rounded-xl">
              <p className="text-sm text-daze-salmon-dark flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-daze-gray px-6 py-4 flex gap-3">
          {step > 1 && (
            <Button
              variant="secondary"
              size="md"
              icon={<ChevronLeft className="w-5 h-5" />}
              iconPosition="left"
              onClick={() => setStep(step - 1)}
            >
              Indietro
            </Button>
          )}

          {step < 4 && (
            <Button
              variant="primaryBlack"
              size="md"
              icon={<ChevronRight className="w-5 h-5" />}
              fullWidth
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedToStep2()) ||
                (step === 2 && !canProceedToStep3())
              }
            >
              Avanti
            </Button>
          )}

          {step === 4 && (
            <Button
              variant="primaryBlack"
              size="md"
              fullWidth
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvataggio...' : 'Conferma e Invia'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
