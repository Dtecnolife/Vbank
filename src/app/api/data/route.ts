import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // Tüm kayıtları getir
    const records = db.prepare(`
      SELECT * FROM vakif_records 
      ORDER BY date DESC, id DESC
    `).all();

    console.log('API: Toplam kayıt sayısı:', records.length);

    if (!records || records.length === 0) {
      return NextResponse.json({
        records: [],
        summary: {
          totalIncome: 0,
          totalExpense: 0,
          netIncome: 0,
          recordCount: 0
        }
      });
    }

    // Summary hesaplama
    const summary = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      recordCount: records.length
    };

    records.forEach((record: any) => {
      if (record.type === 'gelir') {
        summary.totalIncome += record.amount;
      } else if (record.type === 'gider') {
        summary.totalExpense += record.amount;
      }
    });

    summary.netIncome = summary.totalIncome - summary.totalExpense;

    const response = {
      records: records,
      summary: summary
    };

    console.log('API Response summary:', summary);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        error: 'Veritabanı hatası', 
        details: error instanceof Error ? error.message : 'Bilinmeyen hata',
        records: [],
        summary: {
          totalIncome: 0,
          totalExpense: 0,
          netIncome: 0,
          recordCount: 0
        }
      },
      { status: 500 }
    );
  }
} 