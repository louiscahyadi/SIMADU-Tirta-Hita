"use client";

export default function ExportPdfButton() {
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="h-4 w-4"
        aria-hidden
      >
        <path
          d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M14 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14h6M9 18h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Ekspor PDF
    </button>
  );
}
