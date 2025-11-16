"use client";

export default function ClientPrintButton() {
  const handlePrint = () => {
    // Create print-specific CSS
    const printCSS = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-section, #print-section * {
          visibility: visible;
        }
        #print-section {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white !important;
          border: none !important;
          box-shadow: none !important;
        }
        .print-hide {
          display: none !important;
          visibility: hidden !important;
        }
      }
    `;

    // Add print styles to head
    const style = document.createElement("style");
    style.textContent = printCSS;
    document.head.appendChild(style);

    // Print
    window.print();

    // Remove print styles after printing
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1000);
  };

  return (
    <button
      onClick={handlePrint}
      className="btn-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1 text-xs font-medium transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
        />
      </svg>
      Print
    </button>
  );
}
