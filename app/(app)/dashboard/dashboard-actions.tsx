"use client";

import Link from "next/link";

export function DashboardActions() {
  return (
    <div className="flex gap-2 flex-wrap">
      <Link
        href="/properties"
        className="border border-[#3a3966] bg-white/[.06] text-slate-200 rounded-[10px] px-[15px] py-2.5 text-[13px] font-semibold hover:bg-white/10 transition-colors"
      >
        + Add Device · เพิ่มอุปกรณ์
      </Link>
      <Link
        href="/tickets"
        className="bg-brand text-white rounded-[10px] px-[15px] py-2.5 text-[13px] font-semibold hover:bg-brand-hover transition-colors"
      >
        🔧 Log Repair · แจ้งซ่อม
      </Link>
    </div>
  );
}
