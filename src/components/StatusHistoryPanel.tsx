"use client";

import React from "react";

type CaseStatus =
  | "REPORTED"
  | "PSP_CREATED"
  | "SPK_CREATED"
  | "RR_CREATED"
  | "COMPLETED"
  | "MONITORING";

export type StatusHistoryItem = {
  id: string;
  createdAt: string | Date;
  status: CaseStatus;
  note?: string | null;
  actorRole: string;
};

function formatDate(d?: Date | string | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return dt.toISOString();
  }
}

const statusMeta: Record<
  CaseStatus,
  {
    badge: string;
    dotBg: string;
    dotRing: string;
    line: string;
    icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  }
> = {
  REPORTED: {
    badge: "bg-gray-50 text-gray-700",
    dotBg: "bg-gray-400",
    dotRing: "ring-gray-200",
    line: "bg-gray-300",
    icon: (p) => (
      <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
        <path d="M4 3h12a1 1 0 0 1 1 1v8.5a1 1 0 0 1-.553.894l-6 3a1 1 0 0 1-.894 0l-6-3A1 1 0 0 1 3 12.5V4a1 1 0 0 1 1-1Zm1 3v2h10V6H5Z" />
      </svg>
    ),
  },
  PSP_CREATED: {
    badge: "bg-indigo-50 text-indigo-700",
    dotBg: "bg-indigo-500",
    dotRing: "ring-indigo-200",
    line: "bg-indigo-300",
    icon: (p) => (
      <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
        <path d="M4 3a2 2 0 0 0-2 2v8.5A1.5 1.5 0 0 0 3.5 15h9A1.5 1.5 0 0 0 14 13.5V6h2v9H6.5a1.5 1.5 0 1 0 0 3H17a2 2 0 0 0 2-2V6a3 3 0 0 0-3-3H4Zm7 8H5V9h6v2Z" />
      </svg>
    ),
  },
  SPK_CREATED: {
    badge: "bg-blue-50 text-blue-700",
    dotBg: "bg-blue-500",
    dotRing: "ring-blue-200",
    line: "bg-blue-300",
    icon: (p) => (
      <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
        <path d="M6 2a2 2 0 0 0-2 2v12l6-3 6 3V4a2 2 0 0 0-2-2H6Z" />
      </svg>
    ),
  },
  RR_CREATED: {
    badge: "bg-sky-50 text-sky-700",
    dotBg: "bg-sky-500",
    dotRing: "ring-sky-200",
    line: "bg-sky-300",
    icon: (p) => (
      <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
        <path d="M4 3h12v14H4V3Zm2 2v2h8V5H6Zm0 4v2h8V9H6Zm0 4v2h6v-2H6Z" />
      </svg>
    ),
  },
  MONITORING: {
    badge: "bg-amber-50 text-amber-700",
    dotBg: "bg-amber-500",
    dotRing: "ring-amber-200",
    line: "bg-amber-300",
    icon: (p) => (
      <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
        <path d="M10 4c4.418 0 8 3.582 8 6s-3.582 6-8 6-8-3.582-8-6 3.582-6 8-6Zm0 2a4 4 0 1 0 .001 8.001A4 4 0 0 0 10 6Zm0 2a2 2 0 1 1-.001 4.001A2 2 0 0 1 10 8Z" />
      </svg>
    ),
  },
  COMPLETED: {
    badge: "bg-green-50 text-green-700",
    dotBg: "bg-green-500",
    dotRing: "ring-green-200",
    line: "bg-green-300",
    icon: (p) => (
      <svg viewBox="0 0 20 20" fill="currentColor" {...p}>
        <path d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm3.707-9.707-4 4a1 1 0 0 1-1.414 0l-2-2 1.414-1.414L9 10.586l3.293-3.293 1.414 1.414Z" />
      </svg>
    ),
  },
};

function statusBadgeCls(status: CaseStatus) {
  return statusMeta[status]?.badge || "bg-gray-50 text-gray-700";
}

export default function StatusHistoryPanel({
  items,
  currentStatus,
  className,
}: {
  items: StatusHistoryItem[] | null | undefined;
  currentStatus?: CaseStatus | null;
  className?: string;
}) {
  const list = Array.isArray(items)
    ? [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  return (
    <div className={`card p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium">Riwayat Status</div>
        {currentStatus ? (
          <div
            className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusBadgeCls(currentStatus)}`}
            title="Status saat ini"
          >
            {currentStatus}
          </div>
        ) : null}
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-gray-500">Belum ada riwayat.</div>
      ) : (
        <>
          <ol className="relative ml-3 border-l border-gray-200">
            {list.map((it, idx) => {
              const meta = statusMeta[it.status];
              const isLast = idx === list.length - 1;
              return (
                <li key={it.id} className="group relative mb-4 ml-4">
                  {/* colored connector segment to next item */}
                  {!isLast ? (
                    <span
                      className={`absolute -left-[0.38rem] top-6 w-0.5 h-6 md:h-8 ${meta.line}`}
                      aria-hidden
                    />
                  ) : null}

                  {/* status dot with icon */}
                  <span
                    className={`absolute -left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full ${meta.dotBg} text-white ring-2 ${meta.dotRing} shadow transition-transform duration-200 ease-out hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    tabIndex={0}
                    aria-label={`Status ${it.status} pada ${formatDate(it.createdAt)}${it.actorRole ? ", oleh " + it.actorRole : ""}`}
                  >
                    {meta.icon({ className: "h-3 w-3" })}
                  </span>

                  {/* tooltip for icon */}
                  <div className="pointer-events-none absolute left-6 top-0 z-10 hidden min-w-[220px] max-w-[320px] rounded-md border border-gray-200 bg-white p-2 text-xs text-gray-700 shadow-lg group-hover:block group-focus-within:block">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${meta.dotBg} text-white ring-2 ${meta.dotRing}`}
                      >
                        {meta.icon({ className: "h-2.5 w-2.5" })}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${meta.badge}`}>
                        {it.status}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <div>
                        <span className="text-gray-500">Tanggal:</span> {formatDate(it.createdAt)}
                      </div>
                      {it.actorRole ? (
                        <div>
                          <span className="text-gray-500">Oleh:</span> {it.actorRole}
                        </div>
                      ) : null}
                      {it.note ? (
                        <div className="text-gray-600">
                          <span className="text-gray-500">Catatan:</span>{" "}
                          {String(it.note).length > 140
                            ? String(it.note).slice(0, 140) + "…"
                            : it.note}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusBadgeCls(
                        it.status,
                      )} transition-transform duration-200 ease-out hover:scale-[1.03]`}
                      title={`Status: ${it.status}\nTanggal: ${formatDate(it.createdAt)}${it.actorRole ? "\nOleh: " + it.actorRole : ""}${it.note ? "\nCatatan: " + (String(it.note).length > 100 ? String(it.note).slice(0, 100) + "…" : it.note) : ""}`}
                    >
                      {it.status}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(it.createdAt)}</span>
                    {it.actorRole ? (
                      <span className="text-xs text-gray-500">oleh {it.actorRole}</span>
                    ) : null}
                  </div>
                  {it.note ? (
                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{it.note}</div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {/* Legend */}
          <div className="mt-4">
            <div className="text-xs font-medium text-gray-600 mb-2">Legend Status</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {(
                [
                  "REPORTED",
                  "PSP_CREATED",
                  "SPK_CREATED",
                  "RR_CREATED",
                  "MONITORING",
                  "COMPLETED",
                ] as CaseStatus[]
              ).map((s) => {
                const meta = statusMeta[s];
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-4 w-4 items-center justify-center rounded-full ${meta.dotBg} text-white ring-2 ${meta.dotRing}`}
                    >
                      {meta.icon({ className: "h-2.5 w-2.5" })}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] ${meta.badge}`}>{s}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
