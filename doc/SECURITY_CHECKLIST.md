# 🔐 Security Checklist - CASTER Production Environment

> Checklist keamanan untuk memastikan aplikasi CASTER aman di production environment.

---

## 📋 Daftar Isi

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Database Security](#3-database-security)
4. [Server & Network Security](#4-server--network-security)
5. [Application Security](#5-application-security)
6. [Monitoring & Audit](#6-monitoring--audit)
7. [Incident Response](#7-incident-response)

---

## 1. Pre-Deployment Checklist

### Environment Variables

- [ ] **DATABASE_URL** menggunakan credential production (bukan default)
- [ ] **JWT_SECRET** menggunakan string random minimal 32 karakter
- [ ] **JWT_REFRESH_SECRET** berbeda dari JWT_SECRET
- [ ] Semua `.env` files **TIDAK** di-commit ke Git
- [ ] `.env` files memiliki permission `600` (hanya owner bisa baca)

### File `.env` yang Harus Ada:

**Backend (.env):**
```env
# Contoh template - GANTI dengan nilai sebenarnya
DATABASE_URL=mysql://user:PASSWORD@host:3306/caster_db
JWT_SECRET=RANDOM_STRING_MIN_32_CHARS
JWT_REFRESH_SECRET=DIFFERENT_RANDOM_STRING
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
NODE_ENV=production
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 2. Authentication & Authorization

### Password Policy

- [ ] Password minimum 12 karakter
- [ ] Kombinasi huruf besar, kecil, angka, simbol
- [ ] Password hash menggunakan bcrypt dengan cost factor ≥ 10
- [ ] Default password **SUDAH DIGANTI** setelah pertama login

### User Roles (Sudah Implemented)

| Role | Akses |
|------|-------|
| `PENGELOLA` | Create ticket, view own data |
| `RC_STAFF` | Process repairs, update ticket |
| `RC_MANAGER` | Manage RC staff, approve escalation |
| `SUPER_ADMIN` | Full access, user management |

### Session Security

- [ ] JWT access token expires dalam 15 menit
- [ ] Refresh token expires dalam 7 hari
- [ ] Refresh token di-revoke saat logout
- [ ] Token disimpan dengan aman (httpOnly cookies atau secure storage)

---

## 3. Database Security

### Credentials

- [ ] Database password minimal 16 karakter, random
- [ ] User database **BUKAN** root user
- [ ] User database hanya memiliki privilege yang diperlukan:
  ```sql
  GRANT SELECT, INSERT, UPDATE, DELETE ON caster_db.* TO 'caster_user'@'%';
  ```

### Backup Security

- [ ] Backup di-encrypt sebelum disimpan
- [ ] Backup file disimpan di lokasi terpisah dari server utama
- [ ] Akses ke backup file dibatasi
- [ ] Test restore backup secara berkala (minimal bulanan)

### Sensitive Data

- [ ] Password di-hash (tidak plain text)
- [ ] Data sensitif (jika ada) di-encrypt at rest
- [ ] Audit log mencatat semua perubahan data penting

---

## 4. Server & Network Security

### HTTPS/SSL

- [ ] Seluruh traffic menggunakan HTTPS
- [ ] SSL certificate valid dan tidak expired
- [ ] HTTP redirect ke HTTPS
- [ ] HSTS header aktif

### Firewall Rules

- [ ] Port 3306 (MySQL) **TIDAK** exposed ke internet
- [ ] Hanya port 80/443 yang exposed untuk web
- [ ] SSH menggunakan key-based authentication
- [ ] SSH port non-default (bukan 22) jika memungkinkan

### Headers Security

- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Content-Security-Policy` configured

---

## 5. Application Security

### Input Validation (Sudah Implemented via NestJS)

- [ ] DTOs dengan class-validator untuk semua input
- [ ] Parameterized queries via Prisma ORM (SQL Injection protected)
- [ ] File upload validation (jika ada)

### Rate Limiting

- [ ] Login endpoint dibatasi (contoh: 5 attempts per minute)
- [ ] API endpoints dibatasi sesuai kebutuhan
- [ ] Brute force protection aktif

### Error Handling

- [ ] Production mode tidak expose stack trace
- [ ] Error message generic untuk user
- [ ] Detailed log disimpan di server (tidak ke client)

---

## 6. Monitoring & Audit

### Audit Log (Sudah Implemented)

Model `AuditLog` mencatat:
- [ ] Entity type dan ID yang diubah
- [ ] Action (CREATE, UPDATE, DELETE)
- [ ] User yang melakukan perubahan
- [ ] Old value dan new value
- [ ] IP Address dan User Agent
- [ ] Timestamp

### What to Monitor

| Event | Log Level | Alert |
|-------|-----------|-------|
| Failed login attempts (>5 dalam 1 menit) | WARN | Ya |
| Super Admin login | INFO | Optional |
| User creation/deletion | INFO | Ya |
| Database connection error | ERROR | Ya |
| System restart | INFO | Ya |

### Log Retention

- [ ] Access logs: minimal 90 hari
- [ ] Audit logs: minimal 1 tahun
- [ ] Error logs: minimal 30 hari

---

## 7. Incident Response

### Jika Terjadi Security Breach

1. **Isolate** - Putuskan server dari network jika perlu
2. **Assess** - Identifikasi scope breach
3. **Contain** - Hentikan aktivitas mencurigakan
4. **Eradicate** - Hapus malware/backdoor
5. **Recover** - Restore dari backup clean
6. **Learn** - Post-mortem dan improve

### Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| Security Lead | [TBD] | Koordinasi response |
| System Admin | [TBD] | Server access |
| Database Admin | [TBD] | Data recovery |
| Management | [TBD] | Decision making |

---

## ✅ Verification Commands

### Check Environment Security
```bash
# Pastikan .env tidak di-commit
git status --ignored | grep .env

# Check file permissions
ls -la .env

# Test database connection (tanpa expose password)
npx prisma db pull --print
```

### Check SSL Certificate
```bash
# Check certificate expiry
openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 📅 Review Schedule

| Item | Frequency |
|------|-----------|
| Password rotation | Setiap 90 hari |
| SSL certificate check | Bulanan |
| Audit log review | Mingguan |
| Full security audit | Tahunan |
| Penetration testing | Tahunan (recommended) |

---

*Dokumen ini terakhir diupdate: Desember 2024*
