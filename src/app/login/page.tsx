"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

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
      <h1 className="text-xl font-semibold mb-4">Masuk</h1>
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
