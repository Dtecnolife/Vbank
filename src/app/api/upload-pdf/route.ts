import { NextRequest, NextResponse } from 'next/server';
import { parsePdfBuffer } from '../../../../lib/pdf-parser';
import { insertVakifRecords, insertPdfDocument, updatePdfRecordCount, createFileHash } from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('pdf') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'PDF dosyası bulunamadı' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Sadece PDF dosyaları kabul edilir' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ error: 'Dosya boyutu 10MB\'dan büyük olamaz' }, { status: 400 });
    }

    console.log('PDF upload başladı:', file.name, 'Size:', file.size);

    // Dosyayı buffer'a çevir
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Dosya hash'i oluştur
    const fileHash = createFileHash(buffer);
    console.log('File hash:', fileHash);

    // PDF daha önce işlenmiş mi kontrol et
    const pdfResult = insertPdfDocument(file.name, fileHash, file.size);
    
    if (pdfResult.duplicate) {
      return NextResponse.json({
        success: false,
        error: 'Bu PDF dosyası daha önce yüklenmiş',
        message: 'Aynı dosya tekrar yüklenemez',
        duplicate: true,
        filename: file.name
      }, { status: 409 });
    }

    if (!pdfResult.success || !pdfResult.id) {
      throw new Error('PDF kayıt edilemedi');
    }

    console.log('PDF kaydedildi, ID:', pdfResult.id);

    // PDF'i parse et
    let records;
    try {
      records = await parsePdfBuffer(buffer);
      console.log('PDF parsing tamamlandı, kayıt sayısı:', records.length);
    } catch (parseError) {
      console.error('PDF parsing hatası:', parseError);
      return NextResponse.json({
        error: 'PDF işlenirken hata oluştu',
        details: parseError instanceof Error ? parseError.message : 'PDF parse edilemedi',
        filename: file.name
      }, { status: 400 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        error: 'PDF dosyasında geçerli finansal veri bulunamadı',
        message: 'Belge tarih, tutar ve açıklama içeren satırlar içermelidir',
        filename: file.name
      }, { status: 400 });
    }

    // Kayıtları veritabanına ekle (duplicate kontrolü ile)
    console.log('Veritabanına kayıt ekleniyor...');
    const insertResult = insertVakifRecords(records);

    // PDF kayıt sayısını güncelle
    updatePdfRecordCount(pdfResult.id, insertResult.inserted);

    console.log('Insert sonucu:', insertResult);

    if (insertResult.inserted === 0 && insertResult.duplicates > 0) {
      return NextResponse.json({
        success: false,
        error: 'Tüm kayıtlar zaten mevcut',
        message: `${insertResult.total} kayıtın tamamı daha önce eklenmiş`,
        duplicates: insertResult.duplicates,
        total: insertResult.total,
        filename: file.name
      }, { status: 409 });
    }

    const responseMessage = insertResult.duplicates > 0 
      ? `${insertResult.inserted} yeni kayıt eklendi, ${insertResult.duplicates} kayıt zaten mevcuttu`
      : `${insertResult.inserted} kayıt başarıyla eklendi`;

    return NextResponse.json({
      success: true,
      message: responseMessage,
      recordsFound: insertResult.total,
      recordsInserted: insertResult.inserted,
      duplicates: insertResult.duplicates,
      filename: file.name,
      fileHash: fileHash,
      pdfId: pdfResult.id
    });

  } catch (error) {
    console.error('Upload API error:', error);
    
    return NextResponse.json({
      error: 'Dosya yüklenirken hata oluştu',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata'
    }, { status: 500 });
  }
} 