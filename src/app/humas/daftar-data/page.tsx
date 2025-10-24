import { redirect } from "next/navigation";

// Alias page so Daftar Data appears under HUMAS section while reusing the main implementation.
// We forward to /daftar-data with scope=humas and preserve the existing search params.
export default function HumasDaftarDataAlias({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams ?? {})) {
    if (v == null) continue;
    sp.set(k, Array.isArray(v) ? v[0]! : v);
  }
  // Force HUMAS scope
  sp.set("scope", "humas");
  if (!sp.get("tab")) sp.set("tab", "service");
  redirect(`/daftar-data?${sp.toString()}`);
}
