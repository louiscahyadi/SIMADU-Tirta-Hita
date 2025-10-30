"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Props = {
  initialQ?: string;
  initialFrom?: string;
  initialTo?: string;
  initialWSize?: number;
  initialRSize?: number;
  initialPSize?: number;
};

const STORAGE_KEY = "distribusiStatusFilters";

export default function DistribusiStatusFilters({
  initialQ = "",
  initialFrom = "",
  initialTo = "",
  initialWSize = 10,
  initialRSize = 10,
  initialPSize = 10,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [q, setQ] = useState<string>(initialQ || saved?.q || "");
  const [from, setFrom] = useState<string>(initialFrom || saved?.from || "");
  const [to, setTo] = useState<string>(initialTo || saved?.to || "");
  const [wSize, setWSize] = useState<number>(Number(initialWSize || saved?.wSize || 10));
  const [rSize, setRSize] = useState<number>(Number(initialRSize || saved?.rSize || 10));
  const [pSize, setPSize] = useState<number>(Number(initialPSize || saved?.pSize || 10));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ q, from, to, wSize, rSize, pSize }));
    } catch {}
  }, [q, from, to, wSize, rSize, pSize]);

  const buildQuery = (overrides?: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(Array.from(sp.entries()));
    const setOrDelete = (key: string, value?: string | number) => {
      if (value === undefined || value === null || value === "") params.delete(key);
      else params.set(key, String(value));
    };
    setOrDelete("q", q);
    setOrDelete("from", from);
    setOrDelete("to", to);
    setOrDelete("wSize", wSize);
    setOrDelete("rSize", rSize);
    setOrDelete("pSize", pSize);
    // reset pages on filter change
    params.set("wPage", "1");
    params.set("rPage", "1");
    params.set("pPage", "1");
    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        setOrDelete(k, v);
      }
    }
    return `?${params.toString()}`;
  };

  const onApply = (e: React.FormEvent) => {
    e.preventDefault();
    // Quick tab jump: scroll to PSP section after apply
    router.push(`${pathname}${buildQuery()}#psp`);
  };

  const onReset = () => {
    setQ("");
    setFrom("");
    setTo("");
    setWSize(10);
    setRSize(10);
    setPSize(10);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    router.push(pathname!);
  };

  // Preset helpers
  const presetToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFrom(today);
    setTo(today);
    router.push(`${pathname}${buildQuery({ from: today, to: today })}#psp`);
  };
  const presetThisWeek = () => {
    const now = new Date();
    const dw = now.getDay();
    const diffToMonday = dw === 0 ? -6 : 1 - dw;
    const start = new Date(now);
    start.setDate(now.getDate() + diffToMonday);
    const fromW = start.toISOString().slice(0, 10);
    const toW = now.toISOString().slice(0, 10);
    setFrom(fromW);
    setTo(toW);
    router.push(`${pathname}${buildQuery({ from: fromW, to: toW })}#psp`);
  };
  const presetThisMonth = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const toM = now.toISOString().slice(0, 10);
    setFrom(first);
    setTo(toM);
    router.push(`${pathname}${buildQuery({ from: first, to: toM })}#psp`);
  };

  return (
    <form onSubmit={onApply} className="card p-4 flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Kata kunci</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input"
          placeholder="Cari nomor, lokasi, tim..."
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Dari tanggal</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="input"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">Sampai tanggal</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">SPK per halaman</label>
        <select value={wSize} onChange={(e) => setWSize(Number(e.target.value))} className="input">
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">BA per halaman</label>
        <select value={rSize} onChange={(e) => setRSize(Number(e.target.value))} className="input">
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-sm text-gray-600">PSP per halaman</label>
        <select value={pSize} onChange={(e) => setPSize(Number(e.target.value))} className="input">
          {[5, 10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-gray-600">Preset</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={presetToday}
            className="text-blue-700 hover:underline text-sm"
          >
            Hari ini
          </button>
          <button
            type="button"
            onClick={presetThisWeek}
            className="text-blue-700 hover:underline text-sm"
          >
            Minggu ini
          </button>
          <button
            type="button"
            onClick={presetThisMonth}
            className="text-blue-700 hover:underline text-sm"
          >
            Bulan ini
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn btn-sm">
          Terapkan
        </button>
        <button type="button" onClick={onReset} className="btn-outline btn-sm">
          Reset
        </button>
      </div>
    </form>
  );
}
