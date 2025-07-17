const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function convertStocksToJson() {
  try {
    console.log('Excel dosyası okunuyor...');
    
    // Excel dosyasını oku
    const excelPath = path.join(__dirname, '..', 'hisse.xlsx');
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // JSON formatına çevir
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Hisse kodlarını temizle ve benzersiz yap
    const stockCodes = new Set();
    data.forEach((row) => {
      const code = row['ISLEM  KODU']; // Excel'de çift boşluk var
      if (code && typeof code === 'string') {
        stockCodes.add(code.trim().toUpperCase());
      }
    });
    
    // Array'e çevir ve sırala
    const sortedCodes = Array.from(stockCodes).sort();
    
    console.log(`${sortedCodes.length} benzersiz hisse kodu bulundu`);
    
    // Static JSON dosyası oluştur
    const outputPath = path.join(__dirname, '..', 'public', 'stock-codes.json');
    fs.writeFileSync(outputPath, JSON.stringify(sortedCodes, null, 2));
    
    console.log(`Hisse kodları ${outputPath} dosyasına kaydedildi`);
    console.log('İlk 10 hisse:', sortedCodes.slice(0, 10));
    
    return sortedCodes;
  } catch (error) {
    console.error('Dönüştürme hatası:', error);
    return null;
  }
}

convertStocksToJson(); 