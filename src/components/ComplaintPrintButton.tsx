"use client";

interface ComplaintPrintButtonProps {
  complaintId: string;
}

export default function ComplaintPrintButton({ complaintId }: ComplaintPrintButtonProps) {
  const handlePrint = () => {
    const printWindow = window.open(`/api/print/complaint/${complaintId}`, "_blank");
    if (!printWindow) {
      alert("Pop-up diblokir. Mohon izinkan pop-up untuk fitur print.");
    }
  };

  return (
    <button
      className="btn-outline btn-sm cursor-pointer"
      onClick={handlePrint}
      title="Cetak Surat Resmi"
    >
      Cetak
    </button>
  );
}
