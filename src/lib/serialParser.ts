import { Product, SerialParseResult } from '../types';

const PRODUCT_PATTERNS: Record<string, RegExp> = {
  'DB07': /^(\d{2})DB07(\d{5})$/,
  'DT01': /^(\d{2})DT01(\d{5})$/,
  'DS01': /^(\d{2})DS01(\d{5})$/,
  'DK01': /^(\d{2})DK01(\d{5})$/,
  'DT02': /^(\d{2})DT02(\d{5})$/,
  'DS02': /^(\d{2})DS02(\d{5})$/,
  'DK02': /^(\d{2})DK02(\d{5})$/,
  'UT01': /^(\d{2})UT01(\d{5})$/,
  'US01': /^(\d{2})US01(\d{5})$/,
  'OT01': /^(\d{2})OT01(\d{5})$/,
  'OS01': /^(\d{2})OS01(\d{5})$/,
};

const PRODUCT_CODES = [
  'DB07', 'DT01', 'DS01', 'DK01', 'DT02', 'DS02', 'DK02',
  'UT01', 'US01', 'OT01', 'OS01'
];

export async function parseSerial(
  serialCode: string,
  products: Product[]
): Promise<SerialParseResult> {
  const trimmedSerial = serialCode.trim().toUpperCase();

  if (trimmedSerial.length !== 11) {
    return {
      isValid: false,
      error: 'Il seriale deve essere di 11 caratteri'
    };
  }

  for (const productCode of PRODUCT_CODES) {
    const pattern = PRODUCT_PATTERNS[productCode];
    const match = trimmedSerial.match(pattern);

    if (match) {
      const yearStr = match[1];
      const productionStr = match[2];

      const year = 2000 + parseInt(yearStr, 10);
      const currentYear = new Date().getFullYear();

      if (year < 2020 || year > currentYear + 5) {
        return {
          isValid: false,
          error: `Anno non valido: ${year}. Deve essere tra 2020 e ${currentYear + 5}`
        };
      }

      const production_number = parseInt(productionStr, 10);

      const product = products.find(p => p.code === productCode);

      if (!product) {
        return {
          isValid: false,
          error: `Prodotto ${productCode} non trovato nel database`
        };
      }

      return {
        isValid: true,
        product,
        year,
        production_number
      };
    }
  }

  return {
    isValid: false,
    error: 'Formato seriale non riconosciuto. Esempi validi: 25DT0101143, 25DB0701225, 25US0100115'
  };
}

export function validateSerialFormat(serialCode: string): { isValid: boolean; error?: string } {
  const trimmedSerial = serialCode.trim();

  if (trimmedSerial.length === 0) {
    return { isValid: false, error: 'Il seriale è obbligatorio' };
  }

  if (trimmedSerial.length !== 11) {
    return {
      isValid: false,
      error: `Il seriale deve essere di 11 caratteri (attualmente ${trimmedSerial.length})`
    };
  }

  if (!/^[0-9A-Za-z]+$/.test(trimmedSerial)) {
    return {
      isValid: false,
      error: 'Il seriale può contenere solo lettere e numeri'
    };
  }

  return { isValid: true };
}

export function getProductExamples(): string[] {
  return [
    '25DT0101143 - Dazebox Home T',
    '25DS0200173 - Dazebox Share S',
    '25DB0701225 - Dazebox C',
    '25UT0100112 - Urban T',
    '25OT0100134 - Duo T'
  ];
}

export function getProductName(productCode: string): string {
  const names: Record<string, string> = {
    'DB07': 'Dazebox C',
    'DT01': 'Dazebox Home T',
    'DS01': 'Dazebox Home S',
    'DK01': 'Dazebox Home TK',
    'DT02': 'Dazebox Share T',
    'DS02': 'Dazebox Share S',
    'DK02': 'Dazebox Share TK',
    'UT01': 'Urban T',
    'US01': 'Urban S',
    'OT01': 'Duo T',
    'OS01': 'Duo S'
  };

  return names[productCode] || 'Prodotto sconosciuto';
}
