// Static hisse kodları listesi
let stockCodes: Set<string> | null = null;

async function loadStockCodes(): Promise<Set<string>> {
  if (stockCodes) return stockCodes;
  
  try {
    // Static JSON dosyasından hisse kodlarını yükle
    const response = await fetch('/stock-codes.json');
    const codes: string[] = await response.json();
    
    stockCodes = new Set(codes);
    console.log(`${stockCodes.size} hisse kodu yüklendi`);
    return stockCodes;
  } catch (error) {
    console.error('Hisse kodları yükleme hatası:', error);
    // Fallback: en yaygın hisse kodları
    stockCodes = new Set([
      'AKBNK', 'GARAN', 'ISCTR', 'HALKB', 'YKBNK', 'THYAO', 'SISE', 'BIMAS',
      'ALBRK', 'EREGL', 'KRDMD', 'ASELS', 'TUPRS', 'TCELL', 'PGSUS', 'SAHOL',
      'ARCLK', 'KCHOL', 'DOHOL', 'EKGYO', 'TOASO', 'TTKOM', 'PETKM', 'KOZAL'
    ]);
    return stockCodes;
  }
}

// Metinde hisse kodunu bul
export async function findStockCode(text: string): Promise<string | null> {
  const codes = await loadStockCodes();
  
  // Metni büyük harfe çevir ve kelimelere böl
  const words = text.toUpperCase().split(/\s+/);
  
  // Her kelimeyi kontrol et
  for (const word of words) {
    // Sadece harflerden oluşan 4-6 karakterlik kelimeleri kontrol et
    const cleanWord = word.replace(/[^A-Z]/g, '');
    if (cleanWord.length >= 4 && cleanWord.length <= 6 && codes.has(cleanWord)) {
      return cleanWord;
    }
  }
  
  return null;
}

// Tüm hisse kodlarını döndür
export async function getAllStockCodes(): Promise<string[]> {
  const codes = await loadStockCodes();
  return Array.from(codes).sort();
}

// Sync version for client-side filtering (uses fallback codes)
export function findStockCodeSync(text: string): string | null {
  // Fallback kodlar - sadece en yaygın hisseler
  const fallbackCodes = new Set([
    'AKBNK', 'GARAN', 'ISCTR', 'HALKB', 'YKBNK', 'THYAO', 'SISE', 'BIMAS',
    'ALBRK', 'EREGL', 'KRDMD', 'ASELS', 'TUPRS', 'TCELL', 'PGSUS', 'SAHOL',
    'ARCLK', 'KCHOL', 'DOHOL', 'EKGYO', 'TOASO', 'TTKOM', 'PETKM', 'KOZAL',
    // Daha fazla yaygın hisse ekle
    'TTRAK', 'FROTO', 'TAVHL', 'KOZAA', 'MGROS', 'ULKER', 'VAKBN', 'ENKAI',
    'CWENE', 'GUBRF', 'IHEVA', 'KERVT', 'LOGO', 'NETAS', 'OTKAR', 'SELEC',
    'SOKM', 'VESTL', 'YESIL', 'ZRGYO', 'ADGYO', 'AEFES', 'AGESA', 'AGHOL',
    'ALTIN'
  ]);
  
  // Metni büyük harfe çevir ve kelimelere böl
  const words = text.toUpperCase().split(/\s+/);
  
  // Her kelimeyi kontrol et
  for (const word of words) {
    // Sadece harflerden oluşan 4-6 karakterlik kelimeleri kontrol et
    const cleanWord = word.replace(/[^A-Z]/g, '');
    if (cleanWord.length >= 4 && cleanWord.length <= 6 && fallbackCodes.has(cleanWord)) {
      return cleanWord;
    }
  }
  
  return null;
} 