import NextDynamic from "next/dynamic";

import Breadcrumbs from "@/components/Breadcrumbs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Point = { date: string; count: number };
const LineChart = NextDynamic(() => import("@/components/charts/LineChart"), {
  ssr: false,
});

function formatDateShort(d: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    day: "2-digit",
  }).format(d);
}

async function getCountsAndSeries() {
  const [complaints, services, workorders, repairs] = await Promise.all([
    (prisma as any).complaint.count(),
    prisma.serviceRequest.count(),
    prisma.workOrder.count(),
    prisma.repairReport.count(),
  ]);

  const since = new Date();
  since.setDate(since.getDate() - 29);

  // Helper to group per day
  async function series(table: any, createdAtKey = "createdAt") {
    const rows = (await table.findMany({
      where: { [createdAtKey]: { gte: since } },
      select: { [createdAtKey]: true },
    })) as Array<{ [k: string]: Date }>;
    const map = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    for (const r of rows) {
      const key = (r[createdAtKey] as Date).toISOString().slice(0, 10);
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
  }

  const [complaintSeries, srSeries, woSeries, rrSeries] = await Promise.all([
    series((prisma as any).complaint),
    series(prisma.serviceRequest),
    series(prisma.workOrder),
    series(prisma.repairReport),
  ]);

  return {
    counts: { complaints, services, workorders, repairs },
    series: { complaintSeries, srSeries, woSeries, rrSeries },
  };
}

// Replaced TinyLine SVG with interactive Chart.js via LineChart component

export default async function AnalyticsPage() {
  const { counts, series } = await getCountsAndSeries();
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Analitik", href: "/analytics" },
        ]}
      />
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analitik</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-sm text-gray-500">Pengaduan</div>
          <div className="text-2xl font-semibold">{counts.complaints}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Permintaan Service</div>
          <div className="text-2xl font-semibold">{counts.services}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">SPK</div>
          <div className="text-2xl font-semibold">{counts.workorders}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-gray-500">Berita Acara</div>
          <div className="text-2xl font-semibold">{counts.repairs}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(() => {
          const labels = series.complaintSeries.map((p) => p.date.slice(5));
          return (
            <>
              <div className="card p-4 md:col-span-2">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">Perbandingan 30 hari</div>
                  <div className="text-xs text-gray-500">Harian</div>
                </div>
                <LineChart
                  labels={labels}
                  datasets={[
                    {
                      label: "Pengaduan",
                      data: series.complaintSeries.map((p) => p.count),
                      borderColor: "#ef4444",
                      backgroundColor: "rgba(239,68,68,0.15)",
                    },
                    {
                      label: "SR",
                      data: series.srSeries.map((p) => p.count),
                      borderColor: "#6366f1",
                      backgroundColor: "rgba(99,102,241,0.15)",
                    },
                    {
                      label: "SPK",
                      data: series.woSeries.map((p) => p.count),
                      borderColor: "#0ea5e9",
                      backgroundColor: "rgba(14,165,233,0.15)",
                    },
                    {
                      label: "BA",
                      data: series.rrSeries.map((p) => p.count),
                      borderColor: "#22c55e",
                      backgroundColor: "rgba(34,197,94,0.15)",
                    },
                  ]}
                />
              </div>
              <div className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">Pengaduan 30 hari</div>
                  <div className="text-xs text-gray-500">Harian</div>
                </div>
                <LineChart
                  labels={labels}
                  datasets={[
                    {
                      label: "Pengaduan",
                      data: series.complaintSeries.map((p) => p.count),
                      borderColor: "#ef4444",
                      backgroundColor: "rgba(239,68,68,0.15)",
                    },
                  ]}
                />
              </div>
              <div className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">Service Request 30 hari</div>
                  <div className="text-xs text-gray-500">Harian</div>
                </div>
                <LineChart
                  labels={labels}
                  datasets={[
                    {
                      label: "SR",
                      data: series.srSeries.map((p) => p.count),
                      borderColor: "#6366f1",
                      backgroundColor: "rgba(99,102,241,0.15)",
                    },
                  ]}
                />
              </div>
              <div className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">SPK 30 hari</div>
                  <div className="text-xs text-gray-500">Harian</div>
                </div>
                <LineChart
                  labels={labels}
                  datasets={[
                    {
                      label: "SPK",
                      data: series.woSeries.map((p) => p.count),
                      borderColor: "#0ea5e9",
                      backgroundColor: "rgba(14,165,233,0.15)",
                    },
                  ]}
                />
              </div>
              <div className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">Berita Acara 30 hari</div>
                  <div className="text-xs text-gray-500">Harian</div>
                </div>
                <LineChart
                  labels={labels}
                  datasets={[
                    {
                      label: "BA",
                      data: series.rrSeries.map((p) => p.count),
                      borderColor: "#22c55e",
                      backgroundColor: "rgba(34,197,94,0.15)",
                    },
                  ]}
                />
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
