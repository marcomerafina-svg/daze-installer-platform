import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertCircle, Package, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Product, SerialParseResult } from '../../types';
import { parseSerial, validateSerialFormat, getProductExamples } from '../../lib/serialParser';
import Button from '../shared/Button';

interface WallboxSerialModalProps {
  leadId: string;
  installerId: string;
  onClose: () => void;
  onSave: () => void;
}

interface SerialInput {
  id: string;
  value: string;
  parseResult?: SerialParseResult;
  validating: boolean;
}

export default function WallboxSerialModal({ leadId, installerId, onClose, onSave }: WallboxSerialModalProps) {
  const [serials, setSerials] = useState<SerialInput[]>([
    { id: '1', value: '', validating: false }
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  };

  const validateSerial = async (serialInput: SerialInput) => {
    const trimmedValue = serialInput.value.trim().toUpperCase();

    if (!trimmedValue) {
      return;
    }

    const formatCheck = validateSerialFormat(trimmedValue);
    if (!formatCheck.isValid) {
      setSerials(prev =>
        prev.map(s =>
          s.id === serialInput.id
            ? {
                ...s,
                parseResult: { isValid: false, error: formatCheck.error },
                validating: false
              }
            : s
        )
      );
      return;
    }

    setSerials(prev =>
      prev.map(s => (s.id === serialInput.id ? { ...s, validating: true } : s))
    );

    try {
      const { data: existingSerial } = await supabase
        .from('wallbox_serials')
        .select('id')
        .eq('serial_code', trimmedValue)
        .maybeSingle();

      if (existingSerial) {
        setSerials(prev =>
          prev.map(s =>
            s.id === serialInput.id
              ? {
                  ...s,
                  parseResult: { isValid: false, error: 'Questo seriale è già stato registrato' },
                  validating: false
                }
              : s
          )
        );
        return;
      }

      const parseResult = await parseSerial(trimmedValue, products);

      setSerials(prev =>
        prev.map(s =>
          s.id === serialInput.id
            ? { ...s, parseResult, validating: false }
            : s
        )
      );
    } catch (err) {
      console.error('Error validating serial:', err);
      setSerials(prev =>
        prev.map(s =>
          s.id === serialInput.id
            ? {
                ...s,
                parseResult: { isValid: false, error: 'Errore durante la validazione' },
                validating: false
              }
            : s
        )
      );
    }
  };

  const handleSerialChange = (id: string, value: string) => {
    setSerials(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, value, parseResult: undefined }
          : s
      )
    );
    setError('');
    setDuplicateError('');
  };

  const handleSerialBlur = (serialInput: SerialInput) => {
    if (serialInput.value.trim()) {
      validateSerial(serialInput);
    }
  };

  const addSerialInput = () => {
    const newId = (Date.now()).toString();
    setSerials(prev => [...prev, { id: newId, value: '', validating: false }]);
  };

  const removeSerialInput = (id: string) => {
    if (serials.length > 1) {
      setSerials(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSave = async () => {
    const validSerials = serials.filter(s => s.value.trim());

    if (validSerials.length === 0) {
      setError('Inserisci almeno un seriale');
      return;
    }

    const allValid = validSerials.every(s => s.parseResult?.isValid);
    if (!allValid) {
      setError('Correggi tutti gli errori prima di salvare');
      return;
    }

    const serialValues = validSerials.map(s => s.value.trim().toUpperCase());
    const uniqueSerials = new Set(serialValues);
    if (uniqueSerials.size !== serialValues.length) {
      setDuplicateError('Hai inserito seriali duplicati. Ogni seriale deve essere unico.');
      return;
    }

    setSaving(true);
    setError('');
    setDuplicateError('');

    try {
      const serialsToInsert = validSerials.map(s => ({
        lead_id: leadId,
        serial_code: s.value.trim().toUpperCase(),
        product_id: s.parseResult?.product?.id,
        year: s.parseResult?.year,
        production_number: s.parseResult?.production_number,
        installer_id: installerId
      }));

      const { error: insertError } = await supabase
        .from('wallbox_serials')
        .insert(serialsToInsert);

      if (insertError) throw insertError;

      onSave();
    } catch (err: any) {
      console.error('Error saving serials:', err);
      if (err.code === '23505') {
        setError('Uno o più seriali sono già stati registrati');
      } else {
        setError('Errore durante il salvataggio dei seriali');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const validSerialsCount = serials.filter(s => s.parseResult?.isValid).length;
  const productsSummary = serials
    .filter(s => s.parseResult?.isValid && s.parseResult.product)
    .reduce((acc, s) => {
      const productName = s.parseResult!.product!.name;
      acc[productName] = (acc[productName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-squircle max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <Button
          variant="icon"
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-daze-blue p-3 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-daze-black">Seriali Prodotti Installati</h2>
            <p className="text-sm font-inter text-daze-black/70">Aggiungi uno o più seriali dei prodotti installati</p>
          </div>
        </div>

        <div className="bg-daze-blue-light border border-daze-blue/20 rounded-squircle p-4 mb-6 font-inter">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-daze-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-daze-black mb-1">
                Riconoscimento Automatico Prodotto
              </p>
              <p className="text-sm text-daze-black/70">
                Il sistema riconosce automaticamente il prodotto dal seriale. Inserisci il numero di seriale della wallbox installata (11 caratteri).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {serials.map((serial, index) => (
            <div key={serial.id} className="border border-daze-gray rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-daze-black/70">
                      Seriale #{index + 1}
                    </label>
                    {serials.length > 1 && (
                      <button
                        onClick={() => removeSerialInput(serial.id)}
                        className="p-1 text-daze-salmon-dark hover:bg-daze-salmon/10 rounded transition-all"
                        title="Rimuovi seriale"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={serial.value}
                    onChange={(e) => handleSerialChange(serial.id, e.target.value)}
                    onBlur={() => handleSerialBlur(serial)}
                    placeholder="Es: 25DT0101143"
                    maxLength={11}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-daze-blue focus:border-transparent ${
                      serial.parseResult?.isValid === false
                        ? 'border-daze-salmon'
                        : serial.parseResult?.isValid === true
                        ? 'border-daze-forest'
                        : 'border-daze-gray'
                    }`}
                  />
                  {serial.validating && (
                    <p className="mt-2 text-sm text-daze-black/70">
                      Validazione in corso...
                    </p>
                  )}
                  {serial.parseResult && !serial.validating && (
                    <div className="mt-2">
                      {serial.parseResult.isValid ? (
                        <div className="flex items-start gap-2 text-daze-forest bg-daze-forest/10 p-3 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {serial.parseResult.product?.name}
                            </p>
                            <p className="text-xs mt-1">
                              Anno: {serial.parseResult.year} | Progressivo: {serial.parseResult.production_number}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-daze-salmon-dark text-sm">
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                          <span>{serial.parseResult.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addSerialInput}
            className="w-full py-3 border-2 border-dashed border-daze-gray rounded-xl text-daze-black/70 hover:border-daze-blue hover:text-daze-blue transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Aggiungi altro seriale</span>
          </button>
        </div>

        {validSerialsCount > 0 && (
          <div className="bg-daze-gray/10 border border-daze-gray rounded-xl p-4 mb-6">
            <h3 className="text-sm font-medium text-daze-black mb-2">
              Riepilogo ({validSerialsCount} prodotti)
            </h3>
            <div className="space-y-1">
              {Object.entries(productsSummary).map(([productName, count]) => (
                <div key={productName} className="text-sm text-daze-black/70">
                  <span className="font-medium">{count}x</span> {productName}
                </div>
              ))}
            </div>
          </div>
        )}

        {(error || duplicateError) && (
          <div className="mb-4 p-3 bg-daze-salmon/10 border border-daze-salmon/20 rounded-xl">
            <p className="text-sm text-daze-salmon-dark flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error || duplicateError}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" size="md" onClick={onClose} fullWidth>
            Annulla
          </Button>
          <Button
            variant="primaryBlack"
            size="md"
            onClick={handleSave}
            disabled={saving || validSerialsCount === 0}
            fullWidth
          >
            {saving ? 'Salvataggio...' : validSerialsCount === 1 ? 'Salva Seriale' : `Salva ${validSerialsCount} Seriali`}
          </Button>
        </div>

        <p className="text-xs text-daze-black/60 text-center mt-4">
          I seriali verranno salvati e collegati a questa installazione
        </p>
      </div>
    </div>
  );
}
