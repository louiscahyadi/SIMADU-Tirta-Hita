import "./globals.css";

import AuthProvider from "@/components/AuthProvider";
import HeaderAuth from "@/components/HeaderAuth";
import ToastProvider from "@/components/ToastProvider";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PERUMDA Tirta Hita Buleleng - Layanan",
  description: "Sistem penerimaan laporan/pengaduan pelanggan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container py-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold">PERUMDA Tirta Hita Buleleng</h1>
              <nav className="flex items-center gap-4 text-sm">
                <a className="text-gray-700 hover:underline" href="/">
                  Form Input
                </a>
                <a className="text-gray-700 hover:underline" href="/daftar-data" title="HUMAS">
                  Daftar Data (HUMAS)
                </a>
                <a className="text-gray-700 hover:underline" href="/pengaduan">
                  Pengaduan Publik
                </a>
                <HeaderAuth />
              </nav>
            </div>
          </header>
          <ToastProvider>
            <main className="container py-6">{children}</main>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
