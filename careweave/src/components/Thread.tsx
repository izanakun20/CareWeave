import React from "react";

/** Thread motif: woven navy + cyan threads with one coral thread */
export default function Thread({ className = "" }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="CareWeave logo: woven threads"
      role="img"
    >
      {/* Navy thread */}
      <path
        d="M4 24 Q 12 8 24 24 Q 36 40 44 24"
        stroke="#0B1F3A"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cyan thread */}
      <path
        d="M4 24 Q 12 40 24 24 Q 36 8 44 24"
        stroke="#19E3F5"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Coral thread — "the one to pull" */}
      <path
        d="M4 32 Q 24 16 44 32"
        stroke="#E5484D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 4"
        fill="none"
      />
    </svg>
  );
}
