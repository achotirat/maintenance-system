"use client";

import Link from "next/link";
import { advanceTicketAction } from "./actions";

type Ticket = {
  id: string;
  deviceId: string;
  status: string;
  problem: string;
  deviceName: string;
  propertyName: string;
  vendorName: string;
  cost: number | null;
  openedAt: string;
};

function getCategoryIcon(name: string): string {
  const c = name.toLowerCase();
  if (c.includes("air") || c.includes("ac")) return "❄️";
  if (c.includes("pump") || c.includes("water")) return "💧";
  if (c.includes("heater") || c.includes("boiler")) return "🔥";
  if (c.includes("elevator") || c.includes("lift")) return "🛗";
  if (c.includes("tv")) return "📺";
  if (c.includes("wash")) return "🌀";
  if (c.includes("sauna") || c.includes("spa")) return "🧖";
  return "🔩";
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

const COLUMNS = [
  { status: "OPEN", label: "Open · ใหม่", dot: "#f43f5e" },
  { status: "IN_PROGRESS", label: "In progress · กำลังซ่อม", dot: "#5b5bd6" },
  { status: "RESOLVED", label: "Resolved · เสร็จแล้ว", dot: "#10b981" },
] as const;

export function TicketBoard({ tickets }: { tickets: Ticket[] }) {
  const openCount = tickets.filter(
    (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
  ).length;

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-[26px]">
      <div className="flex justify-between items-center flex-wrap gap-2.5 mb-[18px]">
        <div>
          <div className="text-[21px] font-bold">
            Repair tickets · ใบแจ้งซ่อม
          </div>
          <div className="text-[13px] text-secondary">
            {openCount} open · tap to advance status
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-[14px] items-start">
        {COLUMNS.map((col) => {
          const items = tickets.filter((t) => t.status === col.status);
          return (
            <div
              key={col.status}
              className="bg-[var(--bg)] border border-line rounded-[14px] p-2.5"
            >
              <div className="flex items-center gap-2 px-2 pt-1.5 pb-2.5">
                <span
                  className="w-[9px] h-[9px] rounded-full"
                  style={{ background: col.dot }}
                />
                <span className="text-[13px] font-bold">{col.label}</span>
                <span className="text-xs text-tertiary">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((q) => {
                  const icon = getCategoryIcon(q.deviceName);
                  const nextStatus =
                    q.status === "OPEN"
                      ? ("IN_PROGRESS" as const)
                      : q.status === "IN_PROGRESS"
                        ? ("RESOLVED" as const)
                        : null;
                  const advLabel =
                    q.status === "OPEN"
                      ? "Start work → กำลังซ่อม"
                      : q.status === "IN_PROGRESS"
                        ? "Mark resolved → เสร็จ"
                        : null;
                  const advColor =
                    q.status === "OPEN" ? "#5b5bd6" : "#10b981";

                  return (
                    <div
                      key={q.id}
                      className="bg-[var(--card)] rounded-xl shadow-card px-[14px] py-[13px]"
                    >
                      <Link
                        href={`/devices/${q.deviceId}`}
                        className="text-[13.5px] font-semibold text-primary hover:text-brand transition-colors"
                      >
                        {icon} {q.problem}
                      </Link>
                      <div className="text-[11.5px] text-tertiary mt-[5px]">
                        {q.deviceName}
                      </div>
                      <div className="flex justify-between items-center mt-[9px]">
                        <div className="text-[11.5px] text-tertiary">
                          {q.vendorName}
                          {q.cost ? ` · ฿${q.cost.toLocaleString()}` : ""}
                        </div>
                        <span className="text-[11px] text-tertiary">
                          {timeAgo(q.openedAt)} old
                        </span>
                      </div>
                      {nextStatus && advLabel && (
                        <button
                          onClick={() => advanceTicketAction(q.id, nextStatus)}
                          className="mt-2.5 w-full border border-line bg-[var(--bg)] rounded-[9px] py-2 text-[12.5px] font-semibold hover:bg-[var(--card)] transition-colors"
                          style={{ color: advColor }}
                        >
                          {advLabel}
                        </button>
                      )}
                    </div>
                  );
                })}
                {items.length === 0 && (
                  <div className="py-5 px-2 text-center text-xs text-tertiary">
                    Nothing here · ว่าง
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
