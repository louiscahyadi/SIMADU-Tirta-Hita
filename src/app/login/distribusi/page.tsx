"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

import Breadcrumbs from "@/components/Breadcrumbs";

export default function LoginDistribusiPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("credentials", {
      redirect: true,
      callbackUrl: "/distribusi",
      username,
      password,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Beranda", href: "/" },
          { label: "Masuk", href: "/login" },
          { label: "DISTRIBUSI" },
        ]}
      />
      <div className="max-w-sm mx-auto card p-6">
        <h1 className="text-xl font-semibold mb-1">Masuk Divisi DISTRIBUSI</h1>
        <p className="text-sm text-gray-600 mb-4">
          Akses fitur SPK, berita acara, dan pantau status.
        </p>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
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
            <button disabled={loading} className="btn w-full" type="submit">
              {loading ? "Memproses..." : "Masuk DISTRIBUSI"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
