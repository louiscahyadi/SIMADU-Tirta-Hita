"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import ServiceRequestForm from "@/components/ServiceRequestForm";

type Props = {
  className?: string;
};

export default function HumasServiceFormCard({ className }: Props) {
  const router = useRouter();

  const handleSaved = useCallback(
    (id: string) => {
      try {
        router.refresh();
      } catch {}
    },
    [router],
  );

  return (
    <div className={className}>
      <ServiceRequestForm onSaved={handleSaved} />
    </div>
  );
}
