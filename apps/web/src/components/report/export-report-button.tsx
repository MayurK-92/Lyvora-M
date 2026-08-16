"use client";

import { MaterialIcon } from "@lyvora/ui";

/**
 * Opens the browser print dialog aimed at the one-page report sheet
 * (`#report-print-sheet`). Choose “Save as PDF” in the dialog.
 */
export function ExportReportButton() {
  function exportPdf() {
    const sheet = document.getElementById("report-print-sheet");
    if (!sheet) return;
    document.body.classList.add("report-exporting");
    const cleanup = () => {
      document.body.classList.remove("report-exporting");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    // Safari / some Chromium builds need a tick so print CSS applies.
    window.setTimeout(() => window.print(), 50);
  }

  return (
    <button
      type="button"
      onClick={exportPdf}
      className="print-hidden group flex shrink-0 items-center justify-center gap-sm rounded-full bg-primary px-lg py-sm text-on-primary shadow-md transition-all outline-none hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <span className="text-label-md">Export PDF</span>
      <MaterialIcon name="download" className="transition-transform group-hover:translate-y-1" />
    </button>
  );
}
