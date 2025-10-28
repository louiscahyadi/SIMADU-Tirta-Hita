# PERUMDA Tirta Hita Buleleng – Sistem Pengaduan

Aplikasi full-stack (Next.js 14 + Prisma + MySQL + Tailwind) untuk menerima laporan/pengaduan pelanggan dan mencatat:

- Permintaan Service/Perbaikan
- Surat Perintah Kerja (SPK)
- Berita Acara Perbaikan (BAP)

## Fitur

## Cara Menjalankan (Windows PowerShell)

1. Install dependency (butuh Node.js 18+):

```pwsh
npm install
```

2. Siapkan environment variables:

- Salin file `.env.example` menjadi `.env`
- Isi nilai sesuai lingkungan Anda (database, URL, secret)
- Pastikan tidak ada variabel lain di `.env` selain yang ada di `.env.example` (hapus `ADMIN_USERNAME` dan `ADMIN_PASSWORD` jika ada)

3. Generate Prisma Client dan jalankan migrasi (membuat tabel di MySQL):

```pwsh
npm run db:generate
npm run db:migrate
```

4. Jalankan mode development:

```pwsh
npm run dev
```

Aplikasi berjalan di http://localhost:3000

## Environment Variables

Gunakan file `.env` (disalin dari `.env.example`) dan isi nilai berikut:

- NODE_ENV: Lingkungan aplikasi (`development` | `test` | `production`). Default: `development`.
- DATABASE_URL: Koneksi MySQL. Format: `mysql://USER:PASSWORD@HOST:PORT/DB`
- NEXTAUTH_URL: Base URL aplikasi. Contoh dev: `http://localhost:3000`. Produksi harus HTTPS publik.
- NEXTAUTH_SECRET: String acak panjang untuk enkripsi NextAuth (min 16 karakter). Wajib diganti pada produksi.
- HUMAS_USERNAME / HUMAS_PASSWORD: Kredensial internal untuk divisi HUMAS (Credentials provider).
- DISTRIBUSI_USERNAME / DISTRIBUSI_PASSWORD: Kredensial internal untuk divisi DISTRIBUSI (Credentials provider).

Catatan penting:

- Variabel `ADMIN_USERNAME` dan `ADMIN_PASSWORD` tidak digunakan dan tidak ada di schema. Hapus dari `.env` jika ada.
- Jangan commit file `.env` ke repository; hanya commit `.env.example`.
- Contoh cara membuat secret acak (opsional):

```pwsh
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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

## Otentikasi (NextAuth) – Internal Only

Seluruh halaman aplikasi ini ditujukan untuk penggunaan internal divisi HUMAS/DISTRIBUSI. Akses
dibatasi menggunakan NextAuth (Credentials provider) dengan 2 role: `humas` dan `distribusi`.

1. Pastikan `.env` berisi variabel berikut (lihat `.env.example`):

- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET=some-long-random-string`
- `HUMAS_USERNAME=humas`
- `HUMAS_PASSWORD=humas123`
- `DISTRIBUSI_USERNAME=distribusi`
- `DISTRIBUSI_PASSWORD=distribusi123`

Jangan gunakan `ADMIN_USERNAME` / `ADMIN_PASSWORD` karena tidak didukung.

2. Buka `/login` dan pilih divisi untuk masuk. Setelah login, halaman internal dapat diakses sesuai
   role. Pengguna HUMAS dapat membuat PSP dan mengelola data terkait; pengguna DISTRIBUSI
   membuat SPK dan BAP.

Catatan:

- Endpoint `POST /api/complaints` tidak dibuka untuk publik. Jika dibutuhkan kanal pengaduan
  publik, implementasi terpisah harus mempertimbangkan validasi, rate limiting, dan anti-spam.
