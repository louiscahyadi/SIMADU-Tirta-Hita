# 🖨️ Sistem Print Surat Resmi - SIMADU Tirta Hita

## 📋 Fitur yang Telah Diimplementasikan

### ✅ **Komponen Utama**

1. **OfficialLetterPrintLayout** (`src/components/print/OfficialLetterPrintLayout.tsx`)
   - Layout khusus untuk pencetakan surat resmi
   - Support untuk 4 jenis dokumen: SPK, Berita Acara, Service Request, Complaint
   - Kop surat dengan logo dan header resmi
   - Format tanda tangan digital yang proper
   - Responsive design untuk A4

2. **OfficialPrintButton** (`src/components/print/OfficialPrintButton.tsx`)
   - Tombol cetak dengan loading state
   - Membuka window baru untuk preview dan print
   - Error handling yang proper
   - Auto-close setelah print

3. **API Print Endpoint** (`src/app/api/print/[type]/[id]/route.ts`)
   - Dynamic endpoint untuk semua jenis dokumen
   - Fetch data dari database
   - Generate HTML dengan styling lengkap
   - Auto-print functionality

### ✅ **CSS Print Styles** (Updated `globals.css`)

- Print-specific styles untuk surat resmi
- A4 format optimization
- Proper font dan spacing untuk dokumen formal
- Signature handling yang baik
- Hide web elements saat print

### ✅ **Integration ke Halaman Detail**

- Work Order detail page
- Repair Report detail page
- Service Request detail page
- Complaint detail page

## 🚀 **Cara Penggunaan**

### **1. Di Halaman Detail Dokumen**

```tsx
<OfficialPrintButton
  documentType="workorder" // atau "repair", "service", "complaint"
  documentId="document-id"
/>
```

### **2. Direct API Call**

```
GET /api/print/{type}/{id}
```

Dimana:

- `type`: workorder, repair, service, complaint
- `id`: ID dokumen yang akan dicetak

### **3. Print dari Tabel List**

Link "Cetak" di tabel sudah diupdate untuk menggunakan API print yang baru.

## 📄 **Format Surat yang Dihasilkan**

### **Surat Perintah Kerja (SPK)**

- Kop surat PDAM Tirta Hita
- Nomor dan tanggal surat
- Detail tim, teknisi, jadwal
- Instruksi kerja
- Area tanda tangan pembuat dan supervisor

### **Berita Acara Perbaikan**

- Format resmi berita acara
- Detail waktu mulai dan selesai
- Tindakan perbaikan yang dilakukan
- Status hasil perbaikan
- Tanda tangan pelaksana

### **Permintaan Service**

- Data pelapor lengkap
- Deskripsi masalah
- Info petugas yang menerima
- Format surat permintaan service

### **Pengaduan**

- Data pengadu
- Kategori pengaduan
- Isi pengaduan detail
- Status penanganan

## 🎨 **Fitur Print**

### **✅ Kop Surat Profesional**

- Logo PDAM (placeholder)
- Header dengan nama instansi
- Alamat dan kontak
- Border biru sebagai identitas

### **✅ Format A4 Optimal**

- Margin 2cm
- Font Times New Roman 12pt
- Line height 1.5 untuk readability
- Page break yang proper

### **✅ Tanda Tangan Digital**

- Display image signature
- Nama penandatangan
- Waktu tandatangan
- Posisi yang sesuai standar surat

### **✅ Auto Print**

- Window baru untuk preview
- Auto trigger print dialog
- Auto close setelah print
- Error handling untuk pop-up blocker

## 🔧 **Konfigurasi**

### **Logo Instansi**

Edit file `OfficialLetterPrintLayout.tsx` bagian `LetterHeader` untuk mengganti placeholder logo dengan logo aktual:

```tsx
<img src="/logo-tirta-hita.png" alt="Logo PDAM" className="h-16" />
```

### **Header Instansi**

Update informasi instansi di `LetterHeader` component:

- Nama instansi
- Alamat lengkap
- Kontak (telp, email, website)

### **Styling Custom**

Edit function `getPrintStyles()` di API route untuk menyesuaikan styling sesuai kebutuhan.

## 🚨 **Troubleshooting**

### **Pop-up Blocker**

Jika browser memblokir pop-up:

- User akan mendapat alert untuk mengizinkan pop-up
- Tambahkan domain ke whitelist pop-up browser

### **Print Quality**

Untuk hasil print terbaik:

- Gunakan browser Chrome atau Firefox
- Set print settings ke "More settings" > "Options" > "Graphics"
- Pastikan "Background graphics" dicentang

### **Image Loading**

Jika tanda tangan tidak muncul:

- Pastikan image URL accessible
- Check CORS policy untuk external images
- Verify image format (PNG/JPG recommended)

## 📈 **Future Enhancements**

1. **PDF Export Langsung**
   - Integrate dengan library seperti Puppeteer
   - Generate PDF di server-side

2. **Batch Print**
   - Multi-select dokumen
   - Print beberapa surat sekaligus

3. **Template Customization**
   - Admin panel untuk edit template
   - Multiple template options

4. **Digital Watermark**
   - Watermark untuk draft vs final
   - Security features

5. **Print Analytics**
   - Track print frequency
   - Audit log pencetakan dokumen

## 📝 **Status Implementasi**

- ✅ Print Layout Components
- ✅ API Endpoints
- ✅ CSS Print Styles
- ✅ Integration ke UI
- ✅ Error Handling
- ✅ Auto Print Functionality
- ✅ Responsive Design
- ✅ Signature Display

**Status:** READY FOR PRODUCTION 🎉

Sistem print surat resmi sudah lengkap dan siap digunakan untuk mencetak dokumen-dokumen resmi PDAM Tirta Hita dengan format yang profesional dan sesuai standar.
