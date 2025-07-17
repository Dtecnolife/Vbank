import Database from 'better-sqlite3';
import { join } from 'path';
import { createHash } from 'crypto';

export interface VakifRecord {
  id?: number;
  date: string;
  type: 'gelir' | 'gider' | 'bağış' | 'harcama';
  amount: number;
  description: string;
  category: string;
  source: string;
  fingerprint?: string; // Benzersiz tanımlayıcı
}

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(process.cwd(), 'vakif.db');
    db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent access
    db.pragma('journal_mode = WAL');
    
    initializeDatabase();
  }
  
  return db;
}

function initializeDatabase() {
  if (!db) return;

  // Ana tablo oluştur
  db.exec(`
    CREATE TABLE IF NOT EXISTS vakif_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('gelir', 'gider', 'bağış', 'harcama')),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'Manual',
      fingerprint TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // PDF dosyaları tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS pdf_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      file_hash TEXT UNIQUE NOT NULL,
      upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      records_count INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0
    )
  `);

  // Index'ler oluştur
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vakif_date ON vakif_records(date);
    CREATE INDEX IF NOT EXISTS idx_vakif_type ON vakif_records(type);
    CREATE INDEX IF NOT EXISTS idx_vakif_category ON vakif_records(category);
    CREATE INDEX IF NOT EXISTS idx_vakif_fingerprint ON vakif_records(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_pdf_hash ON pdf_documents(file_hash);
  `);

  console.log('Database initialized with fingerprint system');
}

// Benzersiz fingerprint oluştur
export function createRecordFingerprint(record: Omit<VakifRecord, 'id' | 'fingerprint'>): string {
  // Daha güvenilir fingerprint için source ve tüm alanları kullan
  const dataString = `${record.date}|${record.type}|${record.amount.toFixed(8)}|${record.description.trim()}|${record.category}|${record.source}`;
  return createHash('sha256').update(dataString).digest('hex').substring(0, 16);
}

// PDF dosyası hash'i oluştur
export function createFileHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// Kayıt ekle (duplicate kontrolü ile)
export function insertVakifRecord(record: Omit<VakifRecord, 'id'>): { success: boolean; id?: number; duplicate?: boolean } {
  const db = getDatabase();
  
  try {
    const fingerprint = record.fingerprint || createRecordFingerprint(record);
    
    // Duplicate kontrolü
    const existing = db.prepare('SELECT id FROM vakif_records WHERE fingerprint = ?').get(fingerprint);
    if (existing) {
      console.log('Duplicate record found, skipping:', fingerprint);
      return { success: false, duplicate: true };
    }

    const stmt = db.prepare(`
      INSERT INTO vakif_records (date, type, amount, description, category, source, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      record.date,
      record.type,
      record.amount,
      record.description,
      record.category,
      record.source || 'Manual',
      fingerprint
    );
    
    console.log('Record inserted with ID:', result.lastInsertRowid);
    return { success: true, id: result.lastInsertRowid as number };
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      console.log('Duplicate record detected by constraint:', record);
      return { success: false, duplicate: true };
    }
    
    console.error('Insert error:', error);
    throw error;
  }
}

// Toplu kayıt ekleme (duplicate kontrolü ile)
export function insertVakifRecords(records: Omit<VakifRecord, 'id'>[]): { 
  inserted: number; 
  duplicates: number; 
  total: number;
  insertedIds: number[];
} {
  const db = getDatabase();
  const result = { inserted: 0, duplicates: 0, total: records.length, insertedIds: [] as number[] };
  
  // Transaction kullan
  const transaction = db.transaction(() => {
    for (const record of records) {
      const insertResult = insertVakifRecord(record);
      if (insertResult.success && insertResult.id) {
        result.inserted++;
        result.insertedIds.push(insertResult.id);
      } else if (insertResult.duplicate) {
        result.duplicates++;
      }
    }
  });
  
  transaction();
  
  console.log(`Bulk insert completed: ${result.inserted} inserted, ${result.duplicates} duplicates, ${result.total} total`);
  return result;
}

// PDF dosyası kaydet (duplicate kontrolü ile)
export function insertPdfDocument(filename: string, fileHash: string, fileSize: number): { 
  success: boolean; 
  id?: number; 
  duplicate?: boolean 
} {
  const db = getDatabase();
  
  try {
    // Duplicate kontrolü
    const existing = db.prepare('SELECT id FROM pdf_documents WHERE file_hash = ?').get(fileHash);
    if (existing) {
      console.log('PDF already processed:', filename);
      return { success: false, duplicate: true };
    }

    const stmt = db.prepare(`
      INSERT INTO pdf_documents (filename, file_hash, file_size)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(filename, fileHash, fileSize);
    return { success: true, id: result.lastInsertRowid as number };
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return { success: false, duplicate: true };
    }
    throw error;
  }
}

// PDF kayıt sayısını güncelle
export function updatePdfRecordCount(pdfId: number, recordCount: number): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE pdf_documents SET records_count = ? WHERE id = ?');
  stmt.run(recordCount, pdfId);
}

// Tüm kayıtları getir
export function getAllVakifRecords(): VakifRecord[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM vakif_records ORDER BY date DESC, id DESC');
  return stmt.all() as VakifRecord[];
}

// İstatistikleri getir
export function getVakifStats() {
  const db = getDatabase();
  
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalRecords,
      SUM(CASE WHEN type IN ('gelir', 'bağış') THEN amount ELSE 0 END) as totalIncome,
      SUM(CASE WHEN type IN ('gider', 'harcama') THEN amount ELSE 0 END) as totalExpense,
      COUNT(DISTINCT date) as activeDays,
      COUNT(DISTINCT category) as categories
    FROM vakif_records
  `).get() as any;
  
  return {
    ...stats,
    netIncome: stats.totalIncome - stats.totalExpense
  };
}

// PDF'leri getir
export function getAllPdfDocuments() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM pdf_documents ORDER BY upload_date DESC');
  return stmt.all();
}

// Veritabanını temizle (test için)
export function clearDatabase() {
  const db = getDatabase();
  db.exec('DELETE FROM vakif_records');
  db.exec('DELETE FROM pdf_documents');
  console.log('Database cleared');
}

// Duplicate kayıtları temizle
export function removeDuplicateRecords(): number {
  const db = getDatabase();
  
  const result = db.prepare(`
    DELETE FROM vakif_records 
    WHERE id NOT IN (
      SELECT MIN(id) 
      FROM vakif_records 
      GROUP BY fingerprint
    )
  `).run();
  
  console.log(`Removed ${result.changes} duplicate records`);
  return result.changes;
}

// Veritabanı durumunu kontrol et
export function getDatabaseInfo() {
  const db = getDatabase();
  
  const recordCount = db.prepare('SELECT COUNT(*) as count FROM vakif_records').get() as { count: number };
  const pdfCount = db.prepare('SELECT COUNT(*) as count FROM pdf_documents').get() as { count: number };
  const duplicateCount = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT fingerprint, COUNT(*) as cnt 
      FROM vakif_records 
      GROUP BY fingerprint 
      HAVING cnt > 1
    )
  `).get() as { count: number };
  
  return {
    totalRecords: recordCount.count,
    totalPdfs: pdfCount.count,
    duplicateFingerprints: duplicateCount.count
  };
} 