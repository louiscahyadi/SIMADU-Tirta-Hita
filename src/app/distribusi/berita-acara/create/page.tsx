import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import Breadcrumbs from "@/components/Breadcrumbs";
import RepairReportForm from "@/components/RepairReportForm";
import { authOptions } from "@/lib/auth";

type PageProps = {
  searchParams?: { workOrderId?: string; complaintId?: string };
};

export default async function CreateBeritaAcaraPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  // Only distribusi role can access this page
  if (role !== "distribusi") {
    redirect("/login/distribusi");
  }

  const workOrderId = searchParams?.workOrderId;
  const complaintId = searchParams?.complaintId;

  if (!workOrderId) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: "Beranda", href: "/" },
            { label: "DISTRIBUSI", href: "/distribusi" },
            { label: "Buat Berita Acara" },
          ]}
        />
        <div className="max-w-2xl mx-auto card p-6">
          <h1 className="text-xl font-semibold mb-4">Buat Berita Acara Perbaikan</h1>
          <p className="text-red-600 mb-4">
            Parameter workOrderId tidak ditemukan. Silakan akses halaman ini melalui dashboard
            distribusi.
          </p>
          <a href="/distribusi" className="btn">
            ← Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "DISTRIBUSI", href: "/distribusi" },
          { label: "Buat Berita Acara" },
        ]}
      />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Buat Berita Acara Perbaikan</h1>
      </div>
      <div className="max-w-4xl mx-auto">
        <RepairReportForm caseId={complaintId} spkId={workOrderId} />
      </div>
    </div>
  );
}
