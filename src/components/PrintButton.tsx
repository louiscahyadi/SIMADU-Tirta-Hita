"use client";

export default function PrintButton() {
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
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 9V4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V9m-12 0h12m-12 0a3 3 0 0 0-3 3v3.75A1.25 1.25 0 0 0 4.25 17H6m12-8a3 3 0 0 1 3 3v3.75A1.25 1.25 0 0 1 19.75 17H18m-12 0v3.5A1.5 1.5 0 0 0 7.5 22h9a1.5 1.5 0 0 0 1.5-1.5V17m-12 0h12"
        />
      </svg>
      Cetak
    </button>
  );
}
