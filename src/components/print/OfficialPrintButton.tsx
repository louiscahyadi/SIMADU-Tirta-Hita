"use client";

import { useState } from "react";

interface OfficialPrintButtonProps {
  documentType: "workorder" | "repair" | "service" | "complaint";
  documentId: string;
  className?: string;
  children?: React.ReactNode;
}

export default function OfficialPrintButton({
  documentType,
  documentId,
  className = "btn btn-sm",
  children,
}: OfficialPrintButtonProps) {
  const [isPreparing, setIsPreparing] = useState(false);

  const handlePrint = async () => {
    setIsPreparing(true);

    try {
      // Buka window baru untuk print
      const printWindow = window.open("", "_blank", "width=800,height=600");

      if (!printWindow) {
        alert("Pop-up diblokir. Mohon izinkan pop-up untuk fitur print.");
        return;
      }

      // Tampilkan loading
      printWindow.document.write(`
        <html>
          <head><title>Memuat dokumen...</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h3>🔄 Mempersiapkan dokumen untuk dicetak...</h3>
            <p>Mohon tunggu sebentar...</p>
          </body>
        </html>
      `);

      // Fetch print layout dari API
      const response = await fetch(`/api/print/${documentType}/${documentId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch print layout: ${response.statusText}`);
      }

      const printHTML = await response.text();

      // Replace content dengan print layout
      printWindow.document.open();
      printWindow.document.write(printHTML);
      printWindow.document.close();

      // Wait untuk load images dan styling
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();

          // Optional: Close window after print (bisa dihapus jika user ingin preview)
          printWindow.onafterprint = () => {
            printWindow.close();
          };
        } catch (printError) {
          console.error("Print error:", printError);
          alert("Gagal membuka dialog print. Silakan coba lagi.");
        }
      }, 1000);
    } catch (error) {
      console.error("Error preparing print:", error);
      alert("Gagal mempersiapkan dokumen untuk dicetak. Silakan coba lagi.");
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <button
      onClick={handlePrint}
      disabled={isPreparing}
      className={className}
      title="Cetak dokumen resmi"
    >
      {isPreparing ? (
        <>
          <svg
            className="animate-spin h-4 w-4 mr-1"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Mempersiapkan...
        </>
      ) : (
        children || (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-4 w-4 mr-1"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 9V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V9m-12 0h12m-12 0a3 3 0 0 0-3 3v3.75A1.25 1.25 0 0 0 4.25 17H6m12-8a3 3 0 0 1 3 3v3.75A1.25 1.25 0 0 1 19.75 17H18m-12 0v3.5A1.5 1.5 0 0 0 7.5 22h9a1.5 1.5 0 0 0 1.5-1.5V17m-12 0h12"
              />
            </svg>
            Cetak Surat
          </>
        )
      )}
    </button>
  );
}
