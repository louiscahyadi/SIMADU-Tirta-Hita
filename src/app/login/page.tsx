"use client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="max-w-sm mx-auto card p-6">
      <h1 className="text-xl font-semibold mb-1">Masuk</h1>
      <p className="text-sm text-gray-600 mb-4">Pilih divisi untuk pengalaman yang disesuaikan.</p>
      <div className="grid grid-cols-2 gap-2">
        <a className="btn-outline" href="/login/humas" title="Masuk sebagai HUMAS">
          HUMAS
        </a>
        <a className="btn-outline" href="/login/distribusi" title="Masuk sebagai DISTRIBUSI">
          DISTRIBUSI
        </a>
      </div>
    </div>
  );
}
