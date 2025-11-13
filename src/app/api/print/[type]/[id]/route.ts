import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

// Utility function untuk format data signature
function formatSignatureData(
  signature: string | null,
  signedBy: string | null,
  signedAt: Date | string | null,
) {
  if (!signature) return null;

  return {
    image: signature,
    signedBy: signedBy || undefined,
    signedAt: signedAt || undefined,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } },
) {
  try {
    const { type, id } = params;

    let documentData = null;
    let signatures = {};

    switch (type) {
      case "workorder":
      case "spk":
        // Fetch Work Order data
        const workOrder = await prisma.workOrder.findUnique({
          where: { id },
          include: {
            serviceRequest: true,
          },
        });

        if (!workOrder) {
          return NextResponse.json({ error: "Work Order tidak ditemukan" }, { status: 404 });
        }

        documentData = {
          number: workOrder.number,
          createdAt: workOrder.createdAt,
          team: workOrder.team,
          technicians: (workOrder as any).technicians,
          scheduledDate: (workOrder as any).scheduledDate,
          instructions: (workOrder as any).instructions,
          location: workOrder.serviceRequest?.address,
        };

        signatures = {
          creator: formatSignatureData(
            (workOrder as any).creatorSignature,
            (workOrder as any).creatorSignedBy,
            (workOrder as any).creatorSignedAt,
          ),
          supervisor: formatSignatureData(
            (workOrder as any).supervisorSignature,
            (workOrder as any).supervisorSignedBy,
            (workOrder as any).supervisorSignedAt,
          ),
        };
        break;

      case "repair":
      case "berita-acara":
        // Fetch Repair Report data
        const repairReport = await prisma.repairReport.findUnique({
          where: { id },
        });

        if (!repairReport) {
          return NextResponse.json({ error: "Berita Acara tidak ditemukan" }, { status: 404 });
        }

        documentData = {
          createdAt: repairReport.createdAt,
          city: repairReport.city,
          startTime: (repairReport as any).startTime,
          endTime: (repairReport as any).endTime,
          actionTaken: (repairReport as any).actionTaken,
          actions: (repairReport as any).actions,
          result: (repairReport as any).result,
          team: repairReport.team,
          executorName: repairReport.executorName,
        };

        signatures = {
          executor: formatSignatureData(
            (repairReport as any).executorSignature,
            (repairReport as any).executorSignedBy || repairReport.executorName,
            (repairReport as any).executorSignedAt,
          ),
        };
        break;

      case "service":
      case "service-request":
        // Fetch Service Request data
        const serviceRequest = await prisma.serviceRequest.findUnique({
          where: { id },
        });

        if (!serviceRequest) {
          return NextResponse.json(
            { error: "Permintaan Service tidak ditemukan" },
            { status: 404 },
          );
        }

        documentData = {
          createdAt: serviceRequest.createdAt,
          reporterName: serviceRequest.reporterName,
          reporterPhone: serviceRequest.reporterPhone,
          address: serviceRequest.address,
          description: serviceRequest.description,
          receivedAt: (serviceRequest as any).receivedAt,
          receivedBy: (serviceRequest as any).receivedBy,
        };
        break;

      case "complaint":
        // Fetch Complaint data
        const complaint = await prisma.complaint.findUnique({
          where: { id },
        });

        if (!complaint) {
          return NextResponse.json({ error: "Pengaduan tidak ditemukan" }, { status: 404 });
        }

        documentData = {
          createdAt: complaint.createdAt,
          complainantName: complaint.customerName,
          complainantPhone: complaint.phone,
          address: complaint.address,
          category: complaint.category,
          description: complaint.complaintText,
          status: complaint.status,
        };
        break;

      default:
        return NextResponse.json({ error: "Tipe dokumen tidak valid" }, { status: 400 });
    }

    // Generate HTML untuk print
    const printHTML = generatePrintHTML(type, documentData, signatures);

    return new NextResponse(printHTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error generating print layout:", error);
    return NextResponse.json({ error: "Gagal memuat dokumen untuk print" }, { status: 500 });
  }
}

function generatePrintHTML(type: string, data: any, signatures: any) {
  // Mapping type untuk komponen
  const typeMapping: { [key: string]: string } = {
    workorder: "spk",
    spk: "spk",
    repair: "berita-acara",
    "berita-acara": "berita-acara",
    service: "service-request",
    "service-request": "service-request",
    complaint: "complaint",
  };

  const documentType = typeMapping[type] || "spk";

  return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Print - ${getDocumentTitle(documentType, data)}</title>
    <style>
        ${getPrintStyles()}
    </style>
</head>
<body>
    <div class="print-letter-container">
        ${generateLetterHTML(documentType, data, signatures)}
    </div>
    
    <script>
        // Auto print setelah load
        window.onload = function() {
            setTimeout(function() {
                window.print();
                // Close window setelah print dialog
                window.onafterprint = function() {
                    window.close();
                };
            }, 500);
        };
    </script>
</body>
</html>`;
}

function getDocumentTitle(type: string, data: any) {
  switch (type) {
    case "spk":
      return `Surat Perintah Kerja - ${data.number || "No Number"}`;
    case "berita-acara":
      return `Berita Acara Perbaikan - ${data.city || "Unknown"}`;
    case "service-request":
      return `Permintaan Service - ${data.reporterName || "Unknown"}`;
    case "complaint":
      return `Pengaduan - ${data.complainantName || "Unknown"}`;
    default:
      return "Dokumen";
  }
}

function formatDate(date?: Date | string | null) {
  if (!date) return "-";
  const dt = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(dt);
  } catch {
    return "-";
  }
}

function formatDateTime(date?: Date | string | null) {
  if (!date) return "-";
  const dt = typeof date === "string" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return "-";
  }
}

function generateLetterHTML(type: string, data: any, signatures: any) {
  const header = `
    <header class="letter-header">
        <div class="header-flex">
            <div class="logo-section">
                <div class="logo-placeholder">PDAM</div>
            </div>
            <div class="header-text">
                <h1>PERUSAHAAN DAERAH AIR MINUM</h1>
                <h2>TIRTA HITA</h2>
                <div class="address">
                    <div>Jl. Raya Utama No. 123, Kota</div>
                    <div>Telp: (021) 1234-5678 | Email: info@tirtahita.co.id</div>
                </div>
            </div>
        </div>
        <div class="header-border"></div>
    </header>
  `;

  let content = "";

  switch (type) {
    case "spk":
      content = `
        <div class="letter-content">
            <div class="document-title">
                <h3>SURAT PERINTAH KERJA</h3>
            </div>

            <div class="document-meta">
                <table>
                    <tr><td>Nomor</td><td>:</td><td><strong>${data.number || "-"}</strong></td></tr>
                    <tr><td>Tanggal</td><td>:</td><td>${formatDate(data.createdAt)}</td></tr>
                    <tr><td>Tim/Unit</td><td>:</td><td>${data.team || "-"}</td></tr>
                    <tr><td>Teknisi</td><td>:</td><td>${data.technicians || "-"}</td></tr>
                    <tr><td>Jadwal</td><td>:</td><td>${formatDate(data.scheduledDate)}</td></tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">INSTRUKSI KERJA:</div>
                <div class="content-box">
                    ${data.instructions || "Tidak ada instruksi khusus"}
                </div>
            </div>

            ${
              data.location
                ? `
                <div class="section">
                    <div class="section-title">LOKASI KERJA:</div>
                    <div class="content-box">${data.location}</div>
                </div>
            `
                : ""
            }

            <div class="instruction-text">
                <p>Dengan ini memerintahkan kepada tim/teknisi yang tersebut di atas untuk melaksanakan pekerjaan sesuai instruksi yang diberikan.</p>
            </div>
        </div>
      `;
      break;

    case "berita-acara":
      content = `
        <div class="letter-content">
            <div class="document-title">
                <h3>BERITA ACARA PERBAIKAN</h3>
            </div>

            <div class="document-meta">
                <table>
                    <tr><td>Tanggal</td><td>:</td><td>${formatDate(data.createdAt)}</td></tr>
                    <tr><td>Kota</td><td>:</td><td>${data.city || "-"}</td></tr>
                    <tr><td>Waktu Mulai</td><td>:</td><td>${formatDateTime(data.startTime)}</td></tr>
                    <tr><td>Waktu Selesai</td><td>:</td><td>${formatDateTime(data.endTime)}</td></tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">TINDAKAN PERBAIKAN:</div>
                <div class="content-box">
                    ${data.actionTaken || data.actions || "Tidak ada tindakan yang dicatat"}
                </div>
            </div>

            <div class="section">
                <div class="section-title">HASIL PERBAIKAN:</div>
                <div class="content-box">
                    <span class="result-badge result-${(data.result || "").toLowerCase()}">
                        ${data.result || "TIDAK DITENTUKAN"}
                    </span>
                </div>
            </div>

            <div class="instruction-text">
                <p>Demikian berita acara ini dibuat dengan sebenarnya dan dapat dipertanggungjawabkan.</p>
            </div>
        </div>
      `;
      break;

    case "service-request":
      content = `
        <div class="letter-content">
            <div class="document-title">
                <h3>PERMINTAAN SERVICE</h3>
            </div>

            <div class="document-meta">
                <table>
                    <tr><td>Tanggal</td><td>:</td><td>${formatDate(data.createdAt)}</td></tr>
                    <tr><td>Nama Pelapor</td><td>:</td><td>${data.reporterName || "-"}</td></tr>
                    <tr><td>No. Telepon</td><td>:</td><td>${data.reporterPhone || "-"}</td></tr>
                    <tr><td>Alamat</td><td>:</td><td>${data.address || "-"}</td></tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">DESKRIPSI MASALAH:</div>
                <div class="content-box">
                    ${data.description || "Tidak ada deskripsi"}
                </div>
            </div>

            ${
              data.receivedAt
                ? `
                <div class="document-meta">
                    <table>
                        <tr><td>Diterima</td><td>:</td><td>${formatDateTime(data.receivedAt)}</td></tr>
                        <tr><td>Petugas Jaga</td><td>:</td><td>${data.receivedBy || "-"}</td></tr>
                    </table>
                </div>
            `
                : ""
            }
        </div>
      `;
      break;

    case "complaint":
      content = `
        <div class="letter-content">
            <div class="document-title">
                <h3>PENGADUAN</h3>
            </div>

            <div class="document-meta">
                <table>
                    <tr><td>Tanggal</td><td>:</td><td>${formatDate(data.createdAt)}</td></tr>
                    <tr><td>Nama Pengadu</td><td>:</td><td>${data.complainantName || "-"}</td></tr>
                    <tr><td>No. Telepon</td><td>:</td><td>${data.complainantPhone || "-"}</td></tr>
                    <tr><td>Alamat</td><td>:</td><td>${data.address || "-"}</td></tr>
                    <tr><td>Kategori</td><td>:</td><td>${data.category || "-"}</td></tr>
                </table>
            </div>

            <div class="section">
                <div class="section-title">ISI PENGADUAN:</div>
                <div class="content-box">
                    ${data.description || "Tidak ada deskripsi pengaduan"}
                </div>
            </div>

            <div class="section">
                <div class="section-title">STATUS:</div>
                <div class="content-box">
                    <span class="status-badge status-${(data.status || "").toLowerCase()}">
                        ${data.status || "BARU"}
                    </span>
                </div>
            </div>
        </div>
      `;
      break;

    default:
      content = '<div class="letter-content"><p>Tipe dokumen tidak dikenali.</p></div>';
  }

  const signatureSection = generateSignatureHTML(signatures);

  return header + content + signatureSection;
}

function generateSignatureHTML(signatures: any) {
  if (!signatures || (!signatures.creator && !signatures.supervisor && !signatures.executor)) {
    return `
      <div class="signature-area">
          <div class="signature-grid">
              <div class="signature-box">
                  <div class="signature-label">Dibuat oleh,</div>
                  <div class="signature-space"></div>
                  <div class="signature-name">________________</div>
                  <div class="signature-title">Petugas</div>
              </div>
              <div class="signature-box">
                  <div class="signature-label">Disetujui oleh,</div>
                  <div class="signature-space"></div>
                  <div class="signature-name">________________</div>
                  <div class="signature-title">Supervisor</div>
              </div>
          </div>
      </div>
    `;
  }

  let leftSignature = "";
  let rightSignature = "";

  if (signatures.creator || signatures.executor) {
    const sig = signatures.creator || signatures.executor;
    leftSignature = `
      <div class="signature-box">
          <div class="signature-label">${signatures.executor ? "Pelaksana," : "Dibuat oleh,"}</div>
          ${sig.image ? `<img src="${sig.image}" alt="Tanda tangan" class="signature-image">` : '<div class="signature-space"></div>'}
          <div class="signature-name">${sig.signedBy || "________________"}</div>
          <div class="signature-title">${signatures.executor ? "Pelaksana" : "Petugas"}</div>
          ${sig.signedAt ? `<div class="signature-date">${formatDateTime(sig.signedAt)}</div>` : ""}
      </div>
    `;
  }

  if (signatures.supervisor) {
    rightSignature = `
      <div class="signature-box">
          <div class="signature-label">Disetujui oleh,</div>
          ${signatures.supervisor.image ? `<img src="${signatures.supervisor.image}" alt="Tanda tangan" class="signature-image">` : '<div class="signature-space"></div>'}
          <div class="signature-name">${signatures.supervisor.signedBy || "________________"}</div>
          <div class="signature-title">Supervisor</div>
          ${signatures.supervisor.signedAt ? `<div class="signature-date">${formatDateTime(signatures.supervisor.signedAt)}</div>` : ""}
      </div>
    `;
  }

  return `
    <div class="signature-area">
        <div class="signature-grid">
            ${leftSignature}
            ${rightSignature}
        </div>
    </div>
  `;
}

function getPrintStyles() {
  return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Times New Roman', serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        background: #fff;
    }

    .print-letter-container {
        width: 21cm;
        min-height: 29.7cm;
        padding: 2cm;
        margin: 0 auto;
        background: #fff;
    }

    /* Header Styles */
    .letter-header {
        margin-bottom: 2cm;
    }

    .header-flex {
        display: flex;
        align-items: center;
        margin-bottom: 1cm;
    }

    .logo-section {
        width: 4cm;
        margin-right: 1cm;
    }

    .logo-placeholder {
        width: 3cm;
        height: 3cm;
        border: 2px solid #1e40af;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14pt;
        color: #1e40af;
        background: #dbeafe;
    }

    .header-text {
        flex: 1;
        text-align: center;
    }

    .header-text h1 {
        font-size: 16pt;
        font-weight: bold;
        color: #1e3a8a;
        margin-bottom: 0.2cm;
    }

    .header-text h2 {
        font-size: 14pt;
        font-weight: bold;
        color: #1e40af;
        margin-bottom: 0.5cm;
    }

    .header-text .address {
        font-size: 10pt;
        color: #374151;
        line-height: 1.3;
    }

    .header-border {
        height: 4px;
        background: #1e40af;
        margin-top: 0.5cm;
    }

    /* Content Styles */
    .letter-content {
        margin-bottom: 2cm;
    }

    .document-title {
        text-align: center;
        margin-bottom: 1cm;
    }

    .document-title h3 {
        font-size: 14pt;
        font-weight: bold;
        text-decoration: underline;
    }

    .document-meta {
        margin-bottom: 1cm;
    }

    .document-meta table {
        width: 100%;
        font-size: 11pt;
    }

    .document-meta td:first-child {
        width: 3cm;
        padding: 0.1cm 0;
    }

    .document-meta td:nth-child(2) {
        width: 0.5cm;
        padding: 0.1cm 0;
    }

    .document-meta td:last-child {
        padding: 0.1cm 0;
    }

    .section {
        margin-bottom: 1cm;
    }

    .section-title {
        font-weight: bold;
        margin-bottom: 0.3cm;
        font-size: 11pt;
    }

    .content-box {
        border: 1px solid #d1d5db;
        padding: 0.5cm;
        background: #f9fafb;
        min-height: 2cm;
        font-size: 11pt;
    }

    .instruction-text {
        margin-top: 1cm;
        font-size: 11pt;
    }

    /* Badge Styles */
    .result-badge, .status-badge {
        padding: 0.2cm 0.4cm;
        border-radius: 0.2cm;
        font-size: 10pt;
        font-weight: bold;
        display: inline-block;
    }

    .result-fixed {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #16a34a;
    }

    .result-monitoring {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #f59e0b;
    }

    .result- {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #ef4444;
    }

    .status-resolved {
        background: #dcfce7;
        color: #166534;
        border: 1px solid #16a34a;
    }

    .status-in_progress {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #f59e0b;
    }

    .status- {
        background: #fee2e2;
        color: #991b1b;
        border: 1px solid #ef4444;
    }

    /* Signature Styles */
    .signature-area {
        margin-top: 2cm;
        page-break-inside: avoid;
    }

    .signature-grid {
        display: flex;
        justify-content: space-between;
        gap: 2cm;
    }

    .signature-box {
        flex: 1;
        text-align: center;
        font-size: 11pt;
    }

    .signature-label {
        margin-bottom: 1cm;
    }

    .signature-space {
        height: 2cm;
        margin-bottom: 0.5cm;
    }

    .signature-image {
        max-width: 4cm;
        max-height: 2cm;
        margin: 0 auto 0.5cm;
        display: block;
        border: 1px solid #d1d5db;
        padding: 0.2cm;
        background: #f9fafb;
    }

    .signature-name {
        border-bottom: 1px solid #000;
        display: inline-block;
        min-width: 4cm;
        padding-bottom: 0.1cm;
        margin-bottom: 0.2cm;
    }

    .signature-title {
        font-size: 10pt;
    }

    .signature-date {
        font-size: 9pt;
        color: #6b7280;
        margin-top: 0.2cm;
    }

    /* Print-specific rules */
    @media print {
        body {
            margin: 0;
            padding: 0;
        }
        
        .print-letter-container {
            width: 100%;
            margin: 0;
            padding: 1.5cm;
        }

        .signature-area {
            page-break-inside: avoid;
        }

        .section {
            page-break-inside: avoid;
        }
    }
  `;
}
