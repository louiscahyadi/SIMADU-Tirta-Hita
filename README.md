# PERUMDA Tirta Hita Buleleng – Sistem Pengaduan

Aplikasi full-stack (Next.js 14 + Prisma + SQLite + Tailwind) untuk menerima laporan/pengaduan pelanggan dan mencatat:

- Permintaan Service/Perbaikan
- Surat Perintah Kerja (SPK)
- Berita Acara Perbaikan (BAP)

## Fitur

## Cara Menjalankan (Windows PowerShell)

1. Install dependency (butuh Node.js 18+):

```pwsh
npm install
```

2. Generate Prisma Client dan buat database:

```pwsh
npm run db:generate
npm run db:migrate
```

3. Jalankan mode development:

```pwsh
npm run dev
```

Aplikasi berjalan di http://localhost:3000

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

- File `.env` sudah disiapkan untuk SQLite (`file:./dev.db`).
- Skema field diadaptasi dari gambar formulir yang Anda lampirkan; jika ada penyesuaian nama kolom atau isian, kabari saya untuk update cepat.

## Otentikasi Admin (NextAuth)

Halaman internal (misalnya `/daftar-data`) dilindungi oleh autentikasi NextAuth (Credentials provider, role admin).

1. Buat konfigurasi environment:

- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=some-long-random-string`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=admin123`

2. Buka `/login` dan masuk menggunakan kredensial di atas (ubah via env sesuai kebutuhan). Setelah login, halaman internal dapat diakses.

Catatan:

- Halaman publik seperti `/pengaduan` tetap terbuka untuk pelanggan.
- Endpoint publik `POST /api/complaints` tetap diperbolehkan.
