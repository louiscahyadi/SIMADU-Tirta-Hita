import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Suspense } from "react";

import { authOptions } from "@/lib/auth";
import { homeQuerySchema } from "@/lib/schemas/query";

import HomePageClient from "../components/HomePageClient";

type SearchParams = Record<string, string | string[] | undefined>;

const asString = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : (v ?? undefined));

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions as any);
  const role = (session as any)?.user?.role as string | undefined;

  // Normalize query params to strings
  const qp = {
    flow: asString(searchParams.flow),
    serviceRequestId: asString(searchParams.serviceRequestId),
    workOrderId: asString(searchParams.workOrderId),
    complaintId: asString(searchParams.complaintId),
    // Prefill fields for service flow
    customerName: asString(searchParams.customerName),
    address: asString(searchParams.address),
    phone: asString(searchParams.phone),
    connectionNumber: asString(searchParams.connectionNumber),
  };

  const parsed = homeQuerySchema.safeParse(qp);

  // If flow is missing or invalid → redirect based on role
  const flowVal = parsed.success ? parsed.data.flow : (qp.flow as any);
  if (
    !flowVal ||
    (parsed.success === false && parsed.error.issues.some((i) => i.path[0] === "flow"))
  ) {
    if (role === "humas") redirect("/humas");
    if (role === "distribusi") redirect("/distribusi");
    redirect("/login");
  }

  // Collect user-friendly validation errors (excluding flow)
  const errors: string[] = [];
  if (!parsed.success) {
    parsed.error.issues
      .filter((i) => i.path[0] !== "flow")
      .forEach((i) => {
        const field = String(i.path[0] ?? "parameter");
        errors.push(`Parameter '${field}': ${i.message}`);
      });
  }

  // Additional cross-field checks per flow
  if (qp.flow === "workorder" && !qp.serviceRequestId) {
    errors.push("Parameter 'serviceRequestId' wajib untuk flow=workorder.");
  }
  if (qp.flow === "repair" && !qp.workOrderId) {
    errors.push("Parameter 'workOrderId' wajib untuk flow=repair.");
  }

  const srInitial =
    qp.flow === "service"
      ? {
          reporterName: qp.customerName || undefined,
          address: qp.address || undefined,
          reporterPhone: qp.phone || undefined,
          serviceNumber: qp.connectionNumber || undefined,
        }
      : undefined;

  return (
    <Suspense fallback={<div className="p-4">Memuat...</div>}>
      <HomePageClient
        role={role}
        initialFlow={qp.flow as "service" | "workorder" | "repair"}
        initialComplaintId={qp.complaintId || undefined}
        initialServiceRequestId={qp.serviceRequestId || undefined}
        initialWorkOrderId={qp.workOrderId || undefined}
        srInitial={srInitial}
        errors={errors}
      />
    </Suspense>
  );
}
