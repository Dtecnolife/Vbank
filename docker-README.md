# 🐳 Vakıf Dashboard - Docker Setup

Bu dokümanda Vakıf Dashboard uygulamasını Docker ile çalıştırma rehberi bulabilirsiniz.

## 📋 Gereksinimler

- Docker (20.10.0 veya üzeri)
- Docker Compose (2.0.0 veya üzeri)
- Make (opsiyonel, workflow kolaylığı için)

## 🚀 Hızlı Başlangıç

### 1. İlk Kurulum
```bash
# Proje dizinine geç
cd vakif-dashboard

# Gerekli dizinleri oluştur ve dependencies kur
make init

# Docker ile uygulamayı başlat
make up

# Logları izle
make logs
```

### 2. Uygulama Erişimi
- **Uygulama**: http://localhost:8082
- **Health Check**: http://localhost:8082

## 🛠️ Makefile Komutları

### Development
```bash
make dev          # Local development server
make install      # Dependencies kur
make build-local  # Local build
```

### Docker Operations
```bash
make build        # Docker image build et
make up           # Container başlat
make down         # Container durdur
make restart      # Container yeniden başlat
make logs         # Logları göster
make shell        # Container shell'e gir
```

### Database Operations
```bash
make db-backup              # Veritabanı yedekle
make db-restore FILE=x.db   # Veritabanı geri yükle
```

### Production
```bash
make up-prod      # Nginx ile production başlat
make deploy       # Production deployment
```

### Monitoring
```bash
make status       # Container durumları
make health       # Uygulama sağlık kontrolü
make logs-nginx   # Nginx logları
```

### Cleanup
```bash
make clean        # Container ve image temizle
make clean-all    # Tüm Docker verilerini temizle
```

## 📁 Dizin Yapısı

```
vakif-dashboard/
├── Dockerfile              # Next.js uygulama image
├── docker-compose.yml      # Service orchestration
├── Makefile                # Workflow automation
├── .dockerignore           # Docker build exclusions
├── nginx/
│   └── nginx.conf          # Nginx reverse proxy config
├── data/                   # SQLite database (volume)
├── uploads/                # PDF upload directory (volume)
└── backups/                # Database backups
```

## 🔧 Konfigürasyon

### Environment Variables
```bash
# No environment variables needed for static Nginx hosting
```

### Volume Mounts
- No volumes needed for static hosting

### Port Mapping
- `8082:80` - Nginx web server

## 🏭 Production Deployment

### Basic Production Setup
```bash
# Production deployment with Nginx
make deploy

# Check status
make status

# Monitor logs
make logs-all
```

### With SSL/HTTPS
1. SSL sertifikalarını `nginx/ssl/` dizinine koy
2. `nginx/nginx.conf` dosyasında HTTPS server block'unu aktif et
3. Domain name'i güncelle
4. Production deployment yap

```bash
# SSL sertifikaları koy
mkdir -p nginx/ssl
cp your-cert.pem nginx/ssl/fullchain.pem
cp your-key.pem nginx/ssl/privkey.pem

# Nginx config'i SSL için güncelle
# (nginx.conf'taki HTTPS server block'unu aktif et)

# Deploy
make up-prod
```

## 📊 Database Management

### Backup
```bash
# Otomatik timestamped backup
make db-backup

# Manuel backup
cp vakif.db backups/manual-backup-$(date +%Y%m%d).db
```

### Restore
```bash
# Backup'tan restore
make db-restore FILE=backups/vakif-20241201-123456.db
```

### Database Migration
Database mevcut SQLite dosyasından otomatik olarak mount edilir.

## 🔍 Troubleshooting

### Container başlamıyor
```bash
# Logları kontrol et
make logs

# Container status
make status

# Temiz başlangıç
make clean && make up
```

### Database bağlantı sorunu
```bash
# Data dizini izinlerini kontrol et
ls -la data/

# Container içinde database kontrol
make shell
ls -la /app/data/
```

### PDF upload çalışmıyor
```bash
# Upload dizini var mı
mkdir -p uploads

# Nginx upload size limit (50MB default)
# nginx.conf: client_max_body_size 50M;
```

### Port çakışması
```bash
# Portları değiştir
# docker-compose.yml'de port mapping güncelle
```

## 🚀 Performance Optimizations

### Multi-stage Build
- **deps**: Sadece dependencies
- **builder**: Build process
- **runner**: Production runtime

### Size Optimization
- Next.js standalone output
- Alpine Linux base image
- .dockerignore kullanımı

### Caching
- Nginx static file caching
- Docker layer caching
- npm dependencies caching

## 📝 Common Workflows

### Development
```bash
# Local development
make dev

# Docker development
make up && make logs
```

### Testing Changes
```bash
# Rebuild and test
make quick-rebuild

# Quick restart
make quick-restart
```

### Production Update
```bash
# Backup database
make db-backup

# Deploy new version
make deploy

# Verify deployment
make health
```

### Emergency Rollback
```bash
# Stop current
make down

# Restore database if needed
make db-restore FILE=backup.db

# Start previous version
docker-compose up -d
```

## 🆘 Support

Herhangi bir sorun durumunda:

1. **Logları kontrol et**: `make logs`
2. **Status kontrol et**: `make status`
3. **Health check**: `make health`
4. **Clean restart**: `make clean && make up`

---

**Happy Dockerizing! 🐳** 