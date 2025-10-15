"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("credentials", {
      redirect: true,
      callbackUrl: "/daftar-data",
      username,
      password,
    });
    setLoading(false);
  };

  return (
    <div className="max-w-sm mx-auto card p-6">
      <h1 className="text-xl font-semibold mb-1">Masuk</h1>
      <p className="text-sm text-gray-600 mb-4">
        Pilih divisi untuk pengalaman yang disesuaikan atau gunakan kredensial umum.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <a className="btn-outline" href="/login/humas" title="Masuk sebagai HUMAS">
          HUMAS
        </a>
        <a className="btn-outline" href="/login/distribusi" title="Masuk sebagai DISTRIBUSI">
          DISTRIBUSI
        </a>
      </div>
      <form className="space-y-3" onSubmit={submit}>
        <div>
          <label className="label">Username</label>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="pt-2">
          <button disabled={loading} className="btn" type="submit">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </div>
      </form>
    </div>
  );
}
