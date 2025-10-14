"use client";

import { useSession, signOut } from "next-auth/react";

export default function HeaderAuth() {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return <span className="text-gray-400 text-sm">Memuat…</span>;
  }

  const user = session?.user as any;
  const role = user?.role as string | undefined;

  return (
    <div className="flex items-center gap-3">
      {role === "humas" || role === "distribusi" ? (
        <>
          <span className="text-sm text-gray-700">{user?.name || "User"}</span>
          {role ? (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {role}
            </span>
          ) : null}
          <button onClick={() => signOut({ callbackUrl: "/" })} className="btn btn-sm">
            Keluar
          </button>
        </>
      ) : (
        <a className="text-gray-700 hover:underline text-sm" href="/login">
          Masuk
        </a>
      )}
    </div>
  );
}
