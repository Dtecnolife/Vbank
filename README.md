# 🏛️ Vakıf Dashboard

Modern ve kullanıcı dostu vakıf finansal takip sistemi. PDF belgelerini otomatik olarak işleyerek finansal kayıtları veritabanına aktarır ve güçlü dashboard görünümleri sunar.

## ✨ Özellikler

- 📄 **PDF Upload & Parsing**: PDF belgelerini sürükle-bırak ile kolayca yükleyin
- 🤖 **Akıllı Veri Çıkarma**: Türkçe finansal belgelerden otomatik tarih, tutar ve açıklama çıkarma
- 📊 **İnteraktif Dashboard**: Gelir/gider analizi, kategori dağılımları ve aylık trendler
- 💾 **SQLite Veritabanı**: Hızlı ve güvenilir yerel veri saklama
- 📱 **Responsive Tasarım**: Mobil ve desktop uyumlu modern arayüz
- 🎨 **Modern UI**: Tailwind CSS ile şık ve kullanıcı dostu tasarım

## 🚀 Kurulum

1. **Gereksinimler**
   - Node.js 18+ 
   - npm veya yarn

2. **Projeyi İndirin**
   ```bash
   git clone <repository-url>
   cd vakif-dashboard
   ```

3. **Bağımlılıkları Yükleyin**
   ```bash
   npm install
   ```

4. **Geliştirme Sunucusunu Başlatın**
   ```bash
   npm run dev
   ```

5. **Tarayıcıda Açın**
   [http://localhost:3000](http://localhost:3000) adresine gidin

## 📖 Kullanım

### PDF Yükleme
1. Ana sayfadaki "PDF Belgesi Yükle" bölümüne gidin
2. PDF dosyanızı sürükleyip bırakın veya tıklayarak seçin
3. Sistem otomatik olarak belgeyi işleyecek ve finansal kayıtları çıkaracak

### Dashboard İnceleme
- **İstatistik Kartları**: Toplam gelir, gider, net durum ve işlem sayısı
- **Aylık Trend Grafiği**: Son 12 ayın gelir/gider trendi
- **Kategori Dağılımı**: Pasta grafiği ile kategori bazında analiz
- **Detaylı Tablolar**: Kategori bazında detaylar ve son işlemler

### Desteklenen PDF Formatları
Sistem aşağıdaki türdeki Türkçe finansal belgeleri işleyebilir:
- Banka hesap özetleri
- Gelir-gider kayıtları
- Fatura listeleri
- Bağış kayıtları
- Harcama raporları

## 🔧 Teknik Detaylar

### Teknoloji Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **UI/UX**: Tailwind CSS, Lucide Icons
- **Charts**: Recharts
- **Backend**: Next.js API Routes
- **Database**: SQLite3
- **PDF Processing**: pdf-parse

### Proje Yapısı
```
vakif-dashboard/
├── src/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── layout.tsx    # Ana layout
│   │   └── page.tsx      # Ana sayfa
│   └── components/       # React bileşenleri
├── lib/
│   ├── database.ts       # Veritabanı işlemleri
│   └── pdf-parser.ts     # PDF işleme
├── public/               # Statik dosyalar
└── vakif.db             # SQLite veritabanı (otomatik oluşur)
```

### API Endpoints
- `POST /api/upload-pdf` - PDF yükleme ve işleme
- `GET /api/data` - Dashboard verileri

## 📊 Veri Modeli

### VakifRecord
```typescript
interface VakifRecord {
  id?: number;
  date: string;           // YYYY-MM-DD
  type: 'gelir' | 'gider' | 'bağış' | 'harcama';
  amount: number;         // Tutar
  description: string;    // Açıklama
  category?: string;      // Kategori (otomatik algılanır)
  source?: string;        // Kaynak
  created_at?: string;    // Oluşturma zamanı
}
```

### Otomatik Kategori Algılama
Sistem açıklamalara göre şu kategorileri otomatik algılar:
- 👥 Personel (maaş, bordro)
- 🏠 Kira (kira, kiralama)
- ⚡ Faturalar (elektrik, su, doğalgaz)
- 📦 Malzeme (malzeme, alım)
- 💝 Bağışlar (bağış, yardım)
- 🍽️ Yemekhane (yemekhane, yemek)
- 📋 Kırtasiye (kırtasiye, ofis)
- 🚗 Ulaşım (yakıt, benzin)
- 🧹 Temizlik (temizlik)

## 🛠️ Geliştirme

### Build
```bash
npm run build
```

### Linting
```bash
npm run lint
```

### Type Checking
```bash
npx tsc --noEmit
```

## 📝 Notlar

- PDF dosyalarınızın tarih, tutar ve açıklama bilgileri içermesi gerekir
- Türkçe karakter desteği mevcuttur
- Veritabanı dosyası proje kök dizininde otomatik oluşturulur
- Tüm veriler yerel olarak saklanır (gizlilik için)

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

**Not**: Bu uygulama vakıf ve dernek finansal takibi için özel olarak tasarlanmıştır. Profesyonel muhasebe yazılımı değildir.
