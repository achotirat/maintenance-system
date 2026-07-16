import Link from "next/link";
import { getPrimaryOrganizationId } from "@/lib/auth-helpers";
import { getDashboard } from "@/lib/services/dashboard";
import { auth } from "@/lib/auth";
import { DashboardActions } from "./dashboard-actions";

function dueLabel(nextDueAt: Date): { text: string; color: string } {
  const now = new Date();
  const diff = Math.ceil(
    (nextDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0)
    return {
      text: `${-diff}d overdue · เกิน ${-diff} วัน`,
      color: "#f43f5e",
    };
  if (diff === 0)
    return { text: "Due today · ครบกำหนดวันนี้", color: "#d97706" };
  if (diff <= 7) return { text: `Due in ${diff}d · อีก ${diff} วัน`, color: "#d97706" };
  return {
    text: `Due ${nextDueAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    color: "#94a3b8",
  };
}

function warrantyDaysLeft(expiresAt: Date | null): number {
  if (!expiresAt) return Infinity;
  return Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const organizationId = await getPrimaryOrganizationId();
  const session = await auth();
  const userName = session?.user?.name?.split(" ")[0] || "there";
  const { dueSchedules, expiringWarranties, openTickets, overdueSchedules } =
    await getDashboard(organizationId);

  const nOverdue = overdueSchedules.length;
  const nDueSoon = dueSchedules.length;
  const nWarranty = expiringWarranties.length;
  const nTickets = openTickets.length;
  const inProgress = openTickets.filter((t) => t.status === "IN_PROGRESS").length;

  const allTasks = [...overdueSchedules, ...dueSchedules];

  return (
    <div>
      {/* Hero header */}
      <div className="bg-gradient-to-br from-[var(--hero1)] to-[var(--hero2)] px-7 pt-[26px] pb-[62px] text-white">
        <div className="max-w-[1200px] mx-auto flex flex-wrap gap-4 items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {nOverdue > 0
                ? `${nOverdue} tasks overdue · เกินกำหนด ${nOverdue} งาน`
                : "All on track · ทุกอย่างตามแผน 🎉"}
            </div>
            <div className="text-sm text-slate-400 mt-1">
              Good morning, {userName} —{" "}
              {nOverdue > 0
                ? "clear these first."
                : "nothing overdue today."}
            </div>
          </div>
          <DashboardActions />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-[1200px] mx-auto -mt-10 px-5 pb-[30px] flex flex-col gap-[18px]">
        {/* Stat cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          <StatCard
            border="#f43f5e"
            label="⚠ Overdue · เกินกำหนด"
            labelColor="#f43f5e"
            value={nOverdue}
            hint={nOverdue > 0 ? `oldest: ${overdueSchedules[0]?.taskDescription.toLowerCase()}` : "nothing late 🎉"}
          />
          <StatCard
            border="#f59e0b"
            label="◔ Due this week · ใกล้ถึงกำหนด"
            labelColor="#d97706"
            value={nDueSoon}
            hint={nDueSoon > 0 ? `next: ${dueSchedules[0]?.taskDescription.toLowerCase()}` : "clear week"}
          />
          <StatCard
            border="#8b5cf6"
            label="🛡 Warranties · การรับประกัน"
            labelColor="#8b5cf6"
            value={nWarranty}
            hint="expiring within 30 days"
          />
          <StatCard
            border="#5b5bd6"
            label="◎ Open tickets · ใบแจ้งซ่อม"
            labelColor="#5b5bd6"
            value={nTickets}
            hint={`${inProgress} in progress`}
          />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-4 items-start">
          {/* Needs attention */}
          <div className="bg-[var(--card)] rounded-[14px] shadow-card overflow-hidden">
            <div className="px-[18px] py-[14px] border-b border-line flex justify-between items-center">
              <span className="text-sm font-bold">
                Needs attention · ต้องดำเนินการ
              </span>
              <span className="text-xs text-tertiary">{allTasks.length} tasks</span>
            </div>
            {allTasks.length === 0 ? (
              <div className="py-[34px] px-[18px] text-center">
                <div className="text-[34px]">🎉</div>
                <div className="text-sm font-semibold mt-1.5">
                  All caught up · เสร็จหมดแล้ว
                </div>
                <div className="text-[12.5px] text-tertiary">
                  No overdue or upcoming tasks this week.
                </div>
              </div>
            ) : (
              allTasks.slice(0, 8).map((s) => {
                const due = dueLabel(s.nextDueAt);
                const icon = getCategoryIcon(s.device.category);
                return (
                  <Link
                    key={s.id}
                    href={`/devices/${s.deviceId}`}
                    className="flex items-center gap-3 px-[18px] py-[13px] border-b border-line hover:bg-[var(--bg)] transition-colors"
                    style={{ borderLeft: `4px solid ${due.color}` }}
                  >
                    <div
                      className="w-9 h-9 rounded-[10px] grid place-items-center text-[17px] flex-none"
                      style={{ background: `${due.color}15` }}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-semibold truncate">
                        {s.taskDescription}
                      </div>
                      <div className="text-xs font-medium" style={{ color: due.color }}>
                        {due.text}
                      </div>
                      <div className="text-[11.5px] text-tertiary">
                        {s.device.brand} {s.device.model}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4 min-w-0">
            {/* Open tickets */}
            <div className="bg-[var(--card)] rounded-[14px] shadow-card overflow-hidden">
              <div className="px-[18px] py-[14px] border-b border-line flex justify-between items-center">
                <span className="text-sm font-bold">
                  Open tickets · ใบแจ้งซ่อม
                </span>
                <Link
                  href="/tickets"
                  className="text-xs font-semibold text-brand"
                >
                  View board →
                </Link>
              </div>
              {openTickets.length === 0 ? (
                <div className="px-[18px] py-4 text-xs text-tertiary">
                  No open tickets · ไม่มีใบแจ้งซ่อม
                </div>
              ) : (
                openTickets.slice(0, 4).map((t) => {
                  const icon = getCategoryIcon(t.device.category);
                  const stMap = {
                    OPEN: { l: "Open", c: "#f43f5e", t: "rgba(244,63,94,.1)" },
                    IN_PROGRESS: { l: "In progress", c: "#5b5bd6", t: "rgba(91,91,214,.1)" },
                    RESOLVED: { l: "Resolved", c: "#10b981", t: "rgba(16,185,129,.1)" },
                  };
                  const st = stMap[t.status] || stMap.OPEN;
                  return (
                    <Link
                      key={t.id}
                      href={`/devices/${t.deviceId}`}
                      className="block px-[18px] py-3 border-b border-line hover:bg-[var(--bg)] transition-colors"
                    >
                      <div className="flex justify-between items-center gap-2.5">
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold truncate">
                            {icon} {t.problemDescription}
                          </div>
                          <div className="text-[11.5px] text-tertiary">
                            {t.device.brand} {t.device.model}
                          </div>
                        </div>
                        <span
                          className="text-[11px] font-semibold rounded-full px-2.5 py-[3px] flex-none"
                          style={{ color: st.c, background: st.t }}
                        >
                          {st.l}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Warranties expiring */}
            <div className="bg-[var(--card)] rounded-[14px] shadow-card px-[18px] py-[14px]">
              <div className="text-sm font-bold mb-2">
                Warranties expiring · ใกล้หมดประกัน
              </div>
              {expiringWarranties.length === 0 ? (
                <div className="text-xs text-tertiary py-1">
                  Nothing expiring · ไม่มี
                </div>
              ) : (
                expiringWarranties.slice(0, 5).map((d) => {
                  const daysLeft = warrantyDaysLeft(d.warrantyExpiresAt);
                  return (
                    <Link
                      key={d.id}
                      href={`/devices/${d.id}`}
                      className="flex justify-between items-center text-[12.5px] text-secondary py-1.5 gap-2 hover:text-primary transition-colors"
                    >
                      <span>
                        {getCategoryIcon(d.category)} {d.brand} {d.model}
                      </span>
                      <span className="text-[#d97706] font-semibold flex-none">
                        {daysLeft < 0 ? "expired" : `${daysLeft} days`}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  border,
  label,
  labelColor,
  value,
  hint,
}: {
  border: string;
  label: string;
  labelColor: string;
  value: number;
  hint: string;
}) {
  return (
    <div
      className="bg-[var(--card)] rounded-xl shadow-card px-[17px] py-[15px]"
      style={{ borderTop: `3px solid ${border}` }}
    >
      <div className="text-xs font-semibold" style={{ color: labelColor }}>
        {label}
      </div>
      <div className="text-[28px] font-bold mt-[3px]">{value}</div>
      <div className="text-[11.5px] text-tertiary">{hint}</div>
    </div>
  );
}

function getCategoryIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("air") || c.includes("ac") || c.includes("แอร์")) return "❄️";
  if (c.includes("pump") || c.includes("water") || c.includes("ปั๊ม")) return "💧";
  if (c.includes("heater") || c.includes("boiler")) return "🔥";
  if (c.includes("elevator") || c.includes("lift") || c.includes("ลิฟต์")) return "🛗";
  if (c.includes("tv") || c.includes("television")) return "📺";
  if (c.includes("wash") || c.includes("laundry")) return "🌀";
  if (c.includes("sauna") || c.includes("spa")) return "🧖";
  if (c.includes("light") || c.includes("electric")) return "💡";
  if (c.includes("door") || c.includes("lock")) return "🔒";
  return "🔩";
}
