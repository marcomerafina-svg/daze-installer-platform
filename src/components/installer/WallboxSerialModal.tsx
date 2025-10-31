import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertCircle, Package, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Product, SerialParseResult } from '../../types';
import { parseSerial, validateSerialFormat, getProductExamples } from '../../lib/serialParser';

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
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded transition-all"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-br from-[#223aa3] to-[#4a5fc1] p-3 rounded-lg">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Seriali Prodotti Installati</h2>
            <p className="text-sm text-gray-600">Aggiungi uno o più seriali dei prodotti installati</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">
                Riconoscimento Automatico Prodotto
              </p>
              <p className="text-sm text-blue-700">
                Il sistema riconosce automaticamente il prodotto dal seriale. Inserisci il numero di seriale della wallbox installata (11 caratteri).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {serials.map((serial, index) => (
            <div key={serial.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Seriale #{index + 1}
                    </label>
                    {serials.length > 1 && (
                      <button
                        onClick={() => removeSerialInput(serial.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-all"
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#4a5fc1] focus:border-transparent ${
                      serial.parseResult?.isValid === false
                        ? 'border-red-500'
                        : serial.parseResult?.isValid === true
                        ? 'border-green-500'
                        : 'border-gray-300'
                    }`}
                  />
                  {serial.validating && (
                    <p className="mt-2 text-sm text-gray-600">
                      Validazione in corso...
                    </p>
                  )}
                  {serial.parseResult && !serial.validating && (
                    <div className="mt-2">
                      {serial.parseResult.isValid ? (
                        <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
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
                        <div className="flex items-center gap-2 text-red-600 text-sm">
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
            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#4a5fc1] hover:text-[#4a5fc1] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Aggiungi altro seriale</span>
          </button>
        </div>

        {validSerialsCount > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Riepilogo ({validSerialsCount} prodotti)
            </h3>
            <div className="space-y-1">
              {Object.entries(productsSummary).map(([productName, count]) => (
                <div key={productName} className="text-sm text-gray-700">
                  <span className="font-medium">{count}x</span> {productName}
                </div>
              ))}
            </div>
          </div>
        )}

        {(error || duplicateError) && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error || duplicateError}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all"
          >
            Annulla
          </button>
          <button
            onClick={handleSave}
            disabled={saving || validSerialsCount === 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#223aa3] to-[#4a5fc1] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvataggio...' : validSerialsCount === 1 ? 'Salva Seriale' : `Salva ${validSerialsCount} Seriali`}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          I seriali verranno salvati e collegati a questa installazione
        </p>
      </div>
    </div>
  );
}
