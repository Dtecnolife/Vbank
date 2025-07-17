const fs = require('fs');
const path = require('path');

// PDF text'i CSV'ye çeviren script
function pdfToCSV() {
  console.log('🔍 PDF to CSV Converter başlatılıyor...');
  
  // PDF'den text al
  const { execSync } = require('child_process');
  
  try {
    // PDF'i text'e çevir
    const pdfPath = path.join(__dirname, '..', '..', '1 temmuz Vakıf  (1).pdf');
    const textOutput = execSync(`/opt/homebrew/bin/pdftotext "${pdfPath}" -`, { encoding: 'utf8' });
    
    console.log('📊 PDF text extracted, length:', textOutput.length);
    
    // Satırlara böl
    const lines = textOutput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    console.log('📝 Toplam satır:', lines.length);
    
    // İşlem kayıtlarını bul
    const transactions = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Ana pattern: "2025.07.01 valörlü GZ:" 
      if (line.includes('valörlü GZ:')) {
        console.log(`\n🎯 GZ satırı bulundu (${i + 1}): "${line}"`);
        
        // Sonraki satırları topla (max 10 satır)
        let context = [line];
        for (let j = 1; j <= 10 && i + j < lines.length; j++) {
          const nextLine = lines[i + j];
          context.push(nextLine);
          
          // İşlem tamamlandıysa dur
          if (nextLine.includes('ALIS') || nextLine.includes('SATIS')) {
            break;
          }
        }
        
        console.log('📋 Context:', context);
        
        // Transaction parse et
        const transaction = parseTransaction(context);
        if (transaction) {
          transactions.push(transaction);
          console.log('✅ Transaction parsed:', transaction);
        }
      }
    }
    
    console.log(`\n🎯 Toplam ${transactions.length} işlem bulundu`);
    
    // CSV oluştur
    const csvContent = generateCSV(transactions);
    
    // CSV dosyasına yaz
    const csvPath = path.join(__dirname, '..', 'vakif-transactions.csv');
    fs.writeFileSync(csvPath, csvContent);
    
    console.log(`📁 CSV dosyası oluşturuldu: ${csvPath}`);
    
    return transactions;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return [];
  }
}

function parseTransaction(context) {
  try {
    // Tarih çıkar
    const dateMatch = context[0].match(/(\d{4})\.(\d{2})\.(\d{2})/);
    if (!dateMatch) return null;
    
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    
    // Tutar bul (GZ: sonrası)
    let amount = null;
    let isNegative = false;
    
    for (let line of context) {
      const amountMatch = line.match(/GZ:\s*$/) ? 
        context[context.indexOf(line) + 1]?.match(/(-?[\d,.]+)\s*TL/) :
        line.match(/GZ:\s*(-?[\d,.]+)\s*TL/);
      
      if (amountMatch) {
        amount = Math.abs(parseFloat(amountMatch[1].replace(/\./g, '').replace(',', '.')));
        isNegative = amountMatch[1].includes('-');
        break;
      }
    }
    
    if (!amount) return null;
    
    // Hisse bilgileri bul
    let stockCode = null;
    let shareCount = null;
    let unitPrice = null;
    let transactionType = null;
    let time = null;
    
    for (let line of context) {
      // Saat + Hisse + Adet pattern'i
      const stockMatch = line.match(/(\d{2}:\d{2}:\d{2})\s+([A-Z]{4,6})\s+([\d,.]+)\s+ADET/);
      if (stockMatch) {
        time = stockMatch[1];
        stockCode = stockMatch[2];
        shareCount = parseFloat(stockMatch[3].replace(/\./g, '').replace(',', '.'));
      }
      
      // Birim fiyat + işlem tipi
      const priceMatch = line.match(/x([\d,.]+)\s+TL\s+(ALIS|SATIS)/);
      if (priceMatch) {
        unitPrice = parseFloat(priceMatch[1].replace(',', '.'));
        transactionType = priceMatch[2];
      }
    }
    
    if (!stockCode || !shareCount || !unitPrice || !transactionType) {
      console.log('❌ Incomplete data:', { stockCode, shareCount, unitPrice, transactionType });
      return null;
    }
    
    // İşlem tipi belirleme
    const type = (transactionType === 'ALIS' || isNegative) ? 'gider' : 'gelir';
    
    const calculated = shareCount * unitPrice;
    const description = `${stockCode} Hisse ${transactionType === 'ALIS' ? 'Alım' : 'Satış'} (${shareCount.toLocaleString('tr-TR')} adet x ${unitPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL = ${calculated.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL) [${time}]`;
    
    return {
      date,
      time,
      type,
      amount,
      stockCode,
      shareCount,
      unitPrice,
      transactionType,
      description,
      category: 'Hisse Senetleri',
      source: 'PDF Import Vakıf CSV'
    };
    
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

function generateCSV(transactions) {
  const headers = [
    'Date',
    'Time', 
    'Type',
    'Amount',
    'StockCode',
    'ShareCount',
    'UnitPrice',
    'TransactionType',
    'Description',
    'Category',
    'Source'
  ];
  
  let csv = headers.join(',') + '\n';
  
  for (let tx of transactions) {
    const row = [
      tx.date,
      tx.time,
      tx.type,
      tx.amount,
      tx.stockCode,
      tx.shareCount,
      tx.unitPrice,
      tx.transactionType,
      `"${tx.description}"`,
      tx.category,
      tx.source
    ];
    
    csv += row.join(',') + '\n';
  }
  
  return csv;
}

// Script'i çalıştır
if (require.main === module) {
  pdfToCSV();
}

module.exports = { pdfToCSV, parseTransaction }; 