# PERUMDA Tirta Hita Buleleng – Sistem Pengaduan (SIMADU)

Aplikasi full-stack (Next.js 14 + Prisma + MySQL + Tailwind) untuk mengelola laporan/pengaduan internal pelanggan dan mencatat:

- Permintaan Service/Perbaikan (PSP)
- Surat Perintah Kerja (SPK)
- Berita Acara Perbaikan (BAP)

**Sistem ini dirancang untuk penggunaan internal** divisi HUMAS dan DISTRIBUSI Perumda Tirta Hita Buleleng.

## Fitur Utama

- ✅ **Role-Based Access**: Pemisahan akses HUMAS dan DISTRIBUSI
- ✅ **Status Tracking**: Pelacakan status dari REPORTED → COMPLETED
- ✅ **Document Chain**: PSP → SPK → BAP dengan konsistensi data
- ✅ **History Tracking**: Riwayat perubahan status setiap pengaduan
- ✅ **Dashboard**: KPI counters dan summary untuk tiap divisi
- ✅ **Export/Print**: Cetak dokumen untuk keperluan administrasi
- ✅ **Security**: Password hashing (bcrypt), secure sessions, rate limiting

## Cara Menjalankan (Windows PowerShell)

### 1. Install Dependencies

Butuh Node.js 18+ dan npm:

```pwsh
npm install
```

### 2. Setup Environment Variables

```pwsh
# Salin .env.example ke .env
Copy-Item .env.example .env

# Generate secure NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output dan paste ke .env sebagai NEXTAUTH_SECRET

# Generate hashed passwords untuk HUMAS dan DISTRIBUSI
npx ts-node scripts/generate-hashed-passwords.ts
# Copy output (HUMAS_PASSWORD_HASH dan DISTRIBUSI_PASSWORD_HASH) ke .env
```

### 3. Setup Database

**Pastikan MySQL sudah berjalan** (lokal atau via Docker):

```pwsh
# Jika pakai Docker Compose:
npm run db:up
npm run db:ps  # cek status, tunggu sampai Healthy

# Generate Prisma Client
npm run db:generate

# Jalankan database migrations
npm run db:migrate

# (Opsional) Seed data contoh
npm run db:seed
```

### 4. Jalankan Development Server

```pwsh
npm run dev
```

Aplikasi berjalan di http://localhost:3000

### 5. Login

- **HUMAS**: `/login/humas` - Gunakan username/password yang di-set di `.env`
- **DISTRIBUSI**: `/login/distribusi` - Gunakan username/password yang di-set di `.env`

---

## Environment Variables

Gunakan file `.env` (disalin dari `.env.example`) dan isi nilai berikut:

### Required (Wajib):

- **DATABASE_URL**: Koneksi MySQL. Format: `mysql://USER:PASSWORD@HOST:PORT/DB`  
  Contoh: `mysql://root:password@localhost:3306/simadu`

- **NEXTAUTH_URL**: Base URL aplikasi.
  - Development: `http://localhost:3000`
  - Production: Harus HTTPS, contoh: `https://simadu.yourdomain.com`

- **NEXTAUTH_SECRET**: String acak **minimal 32 karakter** untuk enkripsi session.  
  Generate dengan: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

- **HUMAS_USERNAME** / **HUMAS_PASSWORD_HASH**: Kredensial divisi HUMAS  
  Generate hash: `npx ts-node scripts/generate-hashed-passwords.ts`

- **DISTRIBUSI_USERNAME** / **DISTRIBUSI_PASSWORD_HASH**: Kredensial divisi DISTRIBUSI  
  Generate hash: `npx ts-node scripts/generate-hashed-passwords.ts`

### Optional (Opsional):

- **UPSTASH_REDIS_REST_URL** / **UPSTASH_REDIS_REST_TOKEN**: Redis untuk rate limiting (direkomendasikan untuk production)

### ⚠️ **PENTING - SECURITY**:

1. **JANGAN** gunakan plain passwords di production
2. **SELALU** gunakan `*_PASSWORD_HASH` dengan bcrypt
3. **GANTI** `NEXTAUTH_SECRET` dengan nilai yang kuat (min 32 karakter)
4. **JANGAN** commit file `.env` ke repository

Catatan:

- Variabel `ADMIN_USERNAME` dan `ADMIN_PASSWORD` **tidak digunakan** dan sudah deprecated
- Untuk backward compatibility, plain password masih bisa digunakan di development, tapi akan muncul warning

## Menjalankan MySQL via Docker

1. Nyalakan MySQL container:

```pwsh
npm run db:up
npm run db:ps  # pastikan status Healthy
```

2. Jalankan migrasi dan seed (opsional, untuk data contoh):

```pwsh
npm run db:migrate
npm run db:seed
```

3. Matikan container (opsional):

```pwsh
npm run db:down
```

## Fitur: Daftar Data

- Halaman `Daftar Data`: `/daftar-data`
- Menampilkan riwayat input untuk 3 form: Permintaan Service, Surat Perintah Kerja, dan Berita Acara Perbaikan.
- Tersedia filter sederhana:
  - Kata kunci (mencari di beberapa kolom teks)
  - Rentang tanggal berdasarkan tanggal input (createdAt)
- Tombol Print untuk mencetak tampilan tabel saat ini.

Navigasi ke halaman ini tersedia di header.

## Struktur Utama

- `src/app` – App Router Next.js (UI + API)
- `src/components` – Komponen Form
- `src/lib/prisma.ts` – Prisma Client
- `prisma/schema.prisma` – Skema database

## Catatan

- Pastikan service MySQL aktif dan kredensial pada `DATABASE_URL` benar.
- Jika berpindah dari SQLite ke MySQL, data lama tidak otomatis ikut; gunakan migrasi atau seed ulang sesuai kebutuhan.
- Skema field diadaptasi dari gambar formulir yang Anda lampirkan; jika ada penyesuaian nama kolom atau isian, kabari saya untuk update cepat.

## Konsistensi Relasi Kasus (PSP → SPK → BAP)

Untuk menjaga performa query dan kesederhanaan tracking, aplikasi ini mempertahankan dua sumber keterkaitan (Option C):

- Linkage di tabel `Complaint` (kolom `serviceRequestId`, `workOrderId`, `repairReportId`) – memudahkan lookup cepat dari satu kasus.
- Relasi ter-normalisasi antar dokumen: `ServiceRequest` → `WorkOrder` (via `serviceRequestId`) → `RepairReport` (via `workOrderId`).

Penulisan data selalu dilakukan dalam transaksi dan melalui helper sehingga keduanya tetap konsisten. Endpoint `PATCH /api/complaints` tidak mengizinkan perubahan linkage manual; linkage diubah secara otomatis ketika membuat PSP/SPK/BAP.

Selain itu, database MySQL dilengkapi trigger untuk menyelaraskan linkage secara otomatis ketika entitas dibuat/diubah:

- Setelah WorkOrder dibuat/diubah, `Complaint.workOrderId` akan diisi sesuai `WorkOrder.id` berdasarkan `serviceRequestId` yang sama.
- Setelah RepairReport dibuat/diubah, `Complaint.repairReportId` akan diisi sesuai `RepairReport.id` berdasarkan `workOrderId` yang sama.

Cara menerapkan migrasi trigger (butuh MySQL dan `DATABASE_URL` valid):

```pwsh
# Terapkan migrasi Prisma (menjalankan file SQL di prisma/migrations)
# Jika Anda biasa memakai db push, pastikan menggunakan migrate agar SQL trigger dieksekusi
npx prisma migrate deploy

# Opsional (dev): membuat migration baru & menerapkannya otomatis
# npx prisma migrate dev --name consistency_triggers
```

Catatan: Pada migrasi, linkage akan dibackfill terlebih dahulu dari rantai SR→WO→RR yang ada untuk menghindari mismatch awal.

Alat bantu verifikasi:

```pwsh
# Cek konsistensi linkage vs rantai SR→WO→RR
node scripts/verify-case-links.js

# Perbaiki otomatis linkage yang mismatch
node scripts/verify-case-links.js --fix
```

Di sisi aplikasi, setiap pembuatan PSP/SPK/BAP mengeksekusi pemeriksaan konsistensi tambahan dan auto-fix linkage dalam transaksi.

Catatan: Indeks `@@index([status, createdAt])` ditambahkan untuk mempercepat daftar kasus per status.

## Otentikasi (NextAuth) – Internal Only

Seluruh halaman aplikasi ini ditujukan untuk penggunaan **internal** divisi HUMAS dan DISTRIBUSI. Akses dibatasi menggunakan NextAuth (Credentials provider) dengan 2 role:

- **`humas`**: Dapat membuat PSP (Permintaan Service), mengelola pengaduan, akses Daftar Data
- **`distribusi`**: Dapat membuat SPK dan BAP, melihat detail dokumen, akses Status Distribusi

### Setup Kredensial:

1. Generate hashed passwords:

```pwsh
npx ts-node scripts/generate-hashed-passwords.ts
```

2. Tambahkan ke `.env`:

```env
HUMAS_USERNAME=humas
HUMAS_PASSWORD_HASH=<hash dari script>
DISTRIBUSI_USERNAME=distribusi
DISTRIBUSI_PASSWORD_HASH=<hash dari script>
```

3. Login di:

- HUMAS: `/login/humas`
- DISTRIBUSI: `/login/distribusi`

**Catatan**:

- Endpoint `POST /api/complaints` (publik) sudah di-disable. Sistem ini murni internal.
- Rate limiting aktif untuk mencegah abuse
- Session menggunakan JWT dengan secure secret
