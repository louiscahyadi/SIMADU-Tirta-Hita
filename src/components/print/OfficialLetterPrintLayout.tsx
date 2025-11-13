"use client";

import Image from "next/image";

interface SignatureData {
  image?: string;
  name?: string;
  position?: string;
  signedBy?: string;
  signedAt?: Date | string;
}

interface PrintLayoutProps {
  type: "spk" | "berita-acara" | "service-request" | "complaint";
  data: any;
  signatures?: {
    creator?: SignatureData;
    supervisor?: SignatureData;
    executor?: SignatureData;
  };
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

const LetterHeader = () => (
  <header className="letter-header">
    <div className="flex items-center justify-between mb-4">
      <div className="logo-section">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-blue-600 font-bold text-lg">PDAM</span>
        </div>
      </div>
      <div className="header-text text-center flex-1 ml-6">
        <h1 className="text-xl font-bold text-blue-900 mb-1">PERUSAHAAN DAERAH AIR MINUM</h1>
        <h2 className="text-lg font-semibold text-blue-800 mb-2">TIRTA HITA</h2>
        <div className="text-sm text-gray-700 leading-tight">
          <div>Jl. Raya Utama No. 123, Kota</div>
          <div>Telp: (021) 1234-5678 | Email: info@tirtahita.co.id</div>
        </div>
      </div>
    </div>
    <div className="border-t-4 border-blue-600 mb-6"></div>
  </header>
);

const SPKContent = ({ data }: { data: any }) => (
  <div className="letter-content">
    <div className="text-center mb-6">
      <h3 className="text-lg font-bold underline">SURAT PERINTAH KERJA</h3>
    </div>

    <div className="mb-6">
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="w-32 py-1">Nomor</td>
            <td className="w-8 py-1">:</td>
            <td className="py-1 font-medium">{data.number || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Tanggal</td>
            <td className="py-1">:</td>
            <td className="py-1">{formatDate(data.createdAt)}</td>
          </tr>
          <tr>
            <td className="py-1">Tim/Unit</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.team || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Teknisi</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.technicians || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Jadwal</td>
            <td className="py-1">:</td>
            <td className="py-1">{formatDate(data.scheduledDate)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mb-6">
      <div className="font-medium mb-2">INSTRUKSI KERJA:</div>
      <div className="bg-gray-50 p-3 border rounded">
        {data.instructions || "Tidak ada instruksi khusus"}
      </div>
    </div>

    {/* Lokasi kerja jika ada */}
    {data.location && (
      <div className="mb-6">
        <div className="font-medium mb-2">LOKASI KERJA:</div>
        <div className="bg-gray-50 p-3 border rounded">{data.location}</div>
      </div>
    )}

    <div className="mt-8 text-sm">
      <p>
        Dengan ini memerintahkan kepada tim/teknisi yang tersebut di atas untuk melaksanakan
        pekerjaan sesuai instruksi yang diberikan.
      </p>
    </div>
  </div>
);

const BeritaAcaraContent = ({ data }: { data: any }) => (
  <div className="letter-content">
    <div className="text-center mb-6">
      <h3 className="text-lg font-bold underline">BERITA ACARA PERBAIKAN</h3>
    </div>

    <div className="mb-6">
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="w-32 py-1">Tanggal</td>
            <td className="w-8 py-1">:</td>
            <td className="py-1">{formatDate(data.createdAt)}</td>
          </tr>
          <tr>
            <td className="py-1">Kota</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.city || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Waktu Mulai</td>
            <td className="py-1">:</td>
            <td className="py-1">{formatDateTime(data.startTime)}</td>
          </tr>
          <tr>
            <td className="py-1">Waktu Selesai</td>
            <td className="py-1">:</td>
            <td className="py-1">{formatDateTime(data.endTime)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mb-6">
      <div className="font-medium mb-2">TINDAKAN PERBAIKAN:</div>
      <div className="bg-gray-50 p-3 border rounded min-h-20">
        {data.actionTaken || data.actions || "Tidak ada tindakan yang dicatat"}
      </div>
    </div>

    <div className="mb-6">
      <div className="font-medium mb-2">HASIL PERBAIKAN:</div>
      <div className="bg-gray-50 p-3 border rounded">
        <span
          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
            data.result === "FIXED"
              ? "bg-green-100 text-green-800"
              : data.result === "MONITORING"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {data.result || "TIDAK DITENTUKAN"}
        </span>
      </div>
    </div>

    <div className="mt-8 text-sm">
      <p>Demikian berita acara ini dibuat dengan sebenarnya dan dapat dipertanggungjawabkan.</p>
    </div>
  </div>
);

const ServiceRequestContent = ({ data }: { data: any }) => (
  <div className="letter-content">
    <div className="text-center mb-6">
      <h3 className="text-lg font-bold underline">PERMINTAAN SERVICE</h3>
    </div>

    <div className="mb-6">
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="w-32 py-1">Tanggal</td>
            <td className="w-8 py-1">:</td>
            <td className="py-1">{formatDate(data.createdAt)}</td>
          </tr>
          <tr>
            <td className="py-1">Nama Pelapor</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.reporterName || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">No. Telepon</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.reporterPhone || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Alamat</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.address || "-"}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mb-6">
      <div className="font-medium mb-2">DESKRIPSI MASALAH:</div>
      <div className="bg-gray-50 p-3 border rounded min-h-20">
        {data.description || "Tidak ada deskripsi"}
      </div>
    </div>

    {data.receivedAt && (
      <div className="mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <td className="w-32 py-1">Diterima</td>
              <td className="w-8 py-1">:</td>
              <td className="py-1">{formatDateTime(data.receivedAt)}</td>
            </tr>
            <tr>
              <td className="py-1">Petugas Jaga</td>
              <td className="py-1">:</td>
              <td className="py-1">{data.receivedBy || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const ComplaintContent = ({ data }: { data: any }) => (
  <div className="letter-content">
    <div className="text-center mb-6">
      <h3 className="text-lg font-bold underline">PENGADUAN</h3>
    </div>

    <div className="mb-6">
      <table className="w-full text-sm">
        <tbody>
          <tr>
            <td className="w-32 py-1">Tanggal</td>
            <td className="w-8 py-1">:</td>
            <td className="py-1">{formatDate(data.createdAt)}</td>
          </tr>
          <tr>
            <td className="py-1">Nama Pengadu</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.complainantName || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">No. Telepon</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.complainantPhone || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Alamat</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.address || "-"}</td>
          </tr>
          <tr>
            <td className="py-1">Kategori</td>
            <td className="py-1">:</td>
            <td className="py-1">{data.category || "-"}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mb-6">
      <div className="font-medium mb-2">ISI PENGADUAN:</div>
      <div className="bg-gray-50 p-3 border rounded min-h-20">
        {data.description || "Tidak ada deskripsi pengaduan"}
      </div>
    </div>

    <div className="mb-6">
      <div className="font-medium mb-2">STATUS:</div>
      <div className="bg-gray-50 p-3 border rounded">
        <span
          className={`inline-block px-3 py-1 rounded text-sm font-medium ${
            data.status === "RESOLVED"
              ? "bg-green-100 text-green-800"
              : data.status === "IN_PROGRESS"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {data.status || "BARU"}
        </span>
      </div>
    </div>
  </div>
);

const SignatureSection = ({ signatures }: { signatures?: PrintLayoutProps["signatures"] }) => {
  if (!signatures || (!signatures.creator && !signatures.supervisor && !signatures.executor)) {
    return (
      <div className="signature-area mt-12">
        <div className="grid grid-cols-2 gap-12">
          <div className="text-center">
            <div className="mb-16">Dibuat oleh,</div>
            <div className="border-b border-black inline-block min-w-40 pb-1"></div>
            <div className="text-sm mt-2">Petugas</div>
          </div>
          <div className="text-center">
            <div className="mb-16">Disetujui oleh,</div>
            <div className="border-b border-black inline-block min-w-40 pb-1"></div>
            <div className="text-sm mt-2">Supervisor</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signature-area mt-12">
      <div className="grid grid-cols-2 gap-12">
        {/* Pembuat/Creator */}
        {signatures.creator && (
          <div className="text-center">
            <div className="mb-4">{signatures.executor ? "Pelaksana," : "Dibuat oleh,"}</div>
            {signatures.creator.image && (
              <div className="signature-box mx-auto mb-4 w-32 h-20 border border-gray-300 bg-gray-50 flex items-center justify-center">
                <Image
                  src={signatures.creator.image}
                  alt="Tanda tangan"
                  width={120}
                  height={75}
                  className="object-contain"
                />
              </div>
            )}
            <div className="border-b border-black inline-block min-w-40 pb-1 mb-2">
              {signatures.creator.name || signatures.creator.signedBy}
            </div>
            <div className="text-sm">{signatures.creator.position || "Petugas"}</div>
            {signatures.creator.signedAt && (
              <div className="text-xs text-gray-600 mt-1">
                {formatDateTime(signatures.creator.signedAt)}
              </div>
            )}
          </div>
        )}

        {/* Supervisor/Executor */}
        {(signatures.supervisor || signatures.executor) && (
          <div className="text-center">
            <div className="mb-4">{signatures.executor ? "Disahkan oleh," : "Disetujui oleh,"}</div>
            {(signatures.supervisor?.image || signatures.executor?.image) && (
              <div className="signature-box mx-auto mb-4 w-32 h-20 border border-gray-300 bg-gray-50 flex items-center justify-center">
                <Image
                  src={signatures.supervisor?.image || signatures.executor?.image || ""}
                  alt="Tanda tangan"
                  width={120}
                  height={75}
                  className="object-contain"
                />
              </div>
            )}
            <div className="border-b border-black inline-block min-w-40 pb-1 mb-2">
              {signatures.supervisor?.name ||
                signatures.supervisor?.signedBy ||
                signatures.executor?.name ||
                signatures.executor?.signedBy}
            </div>
            <div className="text-sm">
              {signatures.supervisor?.position || signatures.executor?.position || "Supervisor"}
            </div>
            {(signatures.supervisor?.signedAt || signatures.executor?.signedAt) && (
              <div className="text-xs text-gray-600 mt-1">
                {formatDateTime(signatures.supervisor?.signedAt || signatures.executor?.signedAt)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function OfficialLetterPrintLayout({ type, data, signatures }: PrintLayoutProps) {
  return (
    <div className="print-letter-container bg-white p-8 max-w-4xl mx-auto">
      <LetterHeader />

      {type === "spk" && <SPKContent data={data} />}
      {type === "berita-acara" && <BeritaAcaraContent data={data} />}
      {type === "service-request" && <ServiceRequestContent data={data} />}
      {type === "complaint" && <ComplaintContent data={data} />}

      <SignatureSection signatures={signatures} />
    </div>
  );
}
