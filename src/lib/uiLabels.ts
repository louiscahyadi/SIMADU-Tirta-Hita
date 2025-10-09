// Centralized UI label mappings and styles for entities across the app.

export type EntityType = "complaint" | "serviceRequest" | "workOrder" | "repairReport";

type LabelInfo = {
  singular: string;
  plural: string;
  // Optional abbreviation for internal reference or display in parentheses when needed
  abbr?: string;
};

const ENTITY_LABELS: Record<EntityType, LabelInfo> = {
  complaint: {
    singular: "Pengaduan",
    plural: "Pengaduan",
  },
  serviceRequest: {
    singular: "Permintaan Service",
    plural: "Permintaan Service",
    abbr: "SR",
  },
  workOrder: {
    singular: "Surat Perintah Kerja",
    plural: "Surat Perintah Kerja",
    abbr: "SPK",
  },
  repairReport: {
    singular: "Berita Acara",
    plural: "Berita Acara",
    abbr: "BA",
  },
};

export type LabelOptions = {
  plural?: boolean; // use plural form
  withAbbr?: boolean; // append abbreviation in parentheses e.g., "Permintaan Service (SR)"
};

export function entityLabel(type: EntityType, opts?: LabelOptions): string {
  const info = ENTITY_LABELS[type];
  const base = opts?.plural ? info.plural : info.singular;
  if (opts?.withAbbr && info.abbr) return `${base} (${info.abbr})`;
  return base;
}

export function entityAbbr(type: EntityType): string | undefined {
  return ENTITY_LABELS[type].abbr;
}

// Consistent chart styles per entity (used by analytics charts)
export const CHART_STYLES: Record<EntityType, { borderColor: string; backgroundColor: string }> = {
  complaint: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  serviceRequest: {
    borderColor: "#6366f1",
    backgroundColor: "rgba(99,102,241,0.15)",
  },
  workOrder: {
    borderColor: "#0ea5e9",
    backgroundColor: "rgba(14,165,233,0.15)",
  },
  repairReport: {
    borderColor: "#22c55e",
    backgroundColor: "rgba(34,197,94,0.15)",
  },
};

// Convenience helpers for common phrases
export function label30Days(type: EntityType): string {
  return `${entityLabel(type)} 30 hari`;
}
