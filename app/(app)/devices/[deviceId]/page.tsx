import Link from "next/link";
import { getDeviceWithHistory, warrantyStatus } from "@/lib/services/devices";
import { listSchedulesForDevice } from "@/lib/services/maintenance-schedules";
import { listTicketsForDevice } from "@/lib/services/repair-tickets";
import { requireDeviceAccess } from "@/lib/auth-helpers";
import {
  completeScheduleAction,
  createScheduleAction,
  createTicketAction,
  transitionTicketAction,
} from "./actions";
import { notFound } from "next/navigation";

function getCategoryIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("air") || c.includes("ac")) return "❄️";
  if (c.includes("pump") || c.includes("water")) return "💧";
  if (c.includes("heater") || c.includes("boiler")) return "🔥";
  if (c.includes("elevator") || c.includes("lift")) return "🛗";
  if (c.includes("tv")) return "📺";
  if (c.includes("wash")) return "🌀";
  if (c.includes("sauna") || c.includes("spa")) return "🧖";
  return "🔩";
}

function dueLabel(nextDueAt: Date): { text: string; color: string } {
  const diff = Math.ceil(
    (nextDueAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return { text: `${-diff}d overdue · เกิน ${-diff} วัน`, color: "#f43f5e" };
  if (diff === 0) return { text: "Due today · ครบกำหนดวันนี้", color: "#d97706" };
  if (diff <= 7) return { text: `Due in ${diff}d · อีก ${diff} วัน`, color: "#d97706" };
  return { text: `Due ${nextDueAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`, color: "#94a3b8" };
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  await requireDeviceAccess(deviceId);

  const [device, schedules, tickets] = await Promise.all([
    getDeviceWithHistory(deviceId),
    listSchedulesForDevice(deviceId),
    listTicketsForDevice(deviceId),
  ]);

  if (!device) notFound();

  const icon = getCategoryIcon(device.category);
  const status = warrantyStatus(device);
  const wDays = device.warrantyExpiresAt
    ? Math.ceil((device.warrantyExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const wPct =
    device.warrantyExpiresAt && device.purchaseDate
      ? Math.max(0, Math.min(100, Math.round(
          ((device.warrantyExpiresAt.getTime() - Date.now()) /
            (device.warrantyExpiresAt.getTime() - device.purchaseDate.getTime())) * 100
        )))
      : 0;
  const wColor = status === "expired" ? "#f43f5e" : status === "expiring_soon" ? "#d97706" : "#10b981";
  const wLabel =
    status === "expired" ? "Expired · หมดประกันแล้ว"
    : status === "none" ? "No warranty"
    : `${wDays} days left · เหลือ ${wDays} วัน`;

  const boundCreateSchedule = createScheduleAction.bind(null, deviceId);
  const boundCreateTicket = createTicketAction.bind(null, deviceId);

  return (
    <div className="max-w-[860px] mx-auto px-5 py-[22px] flex flex-col gap-4">
      <Link href={`/properties/${device.propertyId}`} className="text-brand text-[13px] font-semibold">
        ← Back to property
      </Link>

      {/* Device header */}
      <div className="bg-[var(--card)] rounded-2xl shadow-card p-5 flex gap-4 flex-wrap items-center">
        <div className="w-[62px] h-[62px] rounded-2xl bg-[var(--bg)] grid place-items-center text-[30px] flex-none">{icon}</div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[19px] font-bold">{device.category}: {device.brand} {device.model}</div>
          <div className="text-[13px] text-secondary">{device.brand} {device.model} · 📍 {device.location.name}</div>
          {device.purchaseDate && (
            <div className="text-xs text-tertiary mt-0.5">
              Purchased {device.purchaseDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>
        {device.receiptPhotoUrl && (
          <a href={device.receiptPhotoUrl} target="_blank" rel="noopener noreferrer"
            className="border border-dashed border-line bg-[var(--bg)] rounded-xl w-[76px] h-[76px] grid place-items-center text-[11px] text-tertiary flex-none text-center">
            <span className="text-xl">🧾</span>Receipt
          </a>
        )}
      </div>

      {device.archivedAt && (
        <div className="bg-[rgba(244,63,94,.08)] border border-[rgba(244,63,94,.2)] rounded-xl px-4 py-3 text-[13px] text-[#f43f5e] font-semibold">
          🗄 Archived on {device.archivedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      )}

      {device.replacesDevice && (
        <div className="bg-[var(--card)] rounded-xl shadow-card px-5 py-3 text-[13px] text-secondary">
          Replaces: <Link href={`/devices/${device.replacesDevice.id}`} className="font-semibold text-brand">{device.replacesDevice.brand} {device.replacesDevice.model}</Link>
        </div>
      )}
      {device.replacedByDevice && (
        <div className="bg-[var(--card)] rounded-xl shadow-card px-5 py-3 text-[13px] text-secondary">
          Replaced by: <Link href={`/devices/${device.replacedByDevice.id}`} className="font-semibold text-brand">{device.replacedByDevice.brand} {device.replacedByDevice.model}</Link>
        </div>
      )}

      {/* Warranty bar */}
      {status !== "none" && (
        <div className="bg-[var(--card)] rounded-2xl shadow-card px-5 py-[18px]">
          <div className="flex justify-between items-baseline mb-2.5">
            <span className="text-sm font-bold">Warranty · การรับประกัน</span>
            <span className="text-[13px] font-bold" style={{ color: wColor }}>{wLabel}</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--bg)] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${wPct}%`, background: wColor }} />
          </div>
          <div className="flex justify-between text-[11.5px] text-tertiary mt-1.5">
            <span>{device.purchaseDate?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span>ends {device.warrantyExpiresAt?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </div>
      )}

      {/* Maintenance schedules */}
      <div className="bg-[var(--card)] rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-[14px] border-b border-line flex justify-between items-center">
          <span className="text-sm font-bold">Maintenance schedule · ตารางบำรุงรักษา</span>
        </div>
        {schedules.length === 0 ? (
          <div className="px-5 py-[22px] text-[12.5px] text-tertiary">No recurring tasks yet — add the first schedule.</div>
        ) : (
          schedules.map((s) => {
            const due = dueLabel(s.nextDueAt);
            return (
              <div key={s.id} className="flex items-center gap-3 px-5 py-[13px] border-b border-line" style={{ borderLeft: `4px solid ${due.color}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold">{s.taskDescription}</div>
                  <div className="text-xs font-medium" style={{ color: due.color }}>{due.text}</div>
                  <div className="text-[11.5px] text-tertiary">repeats every {s.intervalDays} days</div>
                </div>
                <form action={completeScheduleAction.bind(null, deviceId, s.id)}>
                  <button type="submit" className="border border-line bg-[var(--card)] text-[#10b981] rounded-[9px] px-[13px] py-2 text-[12.5px] font-semibold hover:bg-[rgba(16,185,129,.08)] transition-colors">
                    ✓ Done
                  </button>
                </form>
              </div>
            );
          })
        )}
        <div className="px-5 py-[14px] border-t border-line">
          <div className="text-xs font-semibold text-secondary mb-2">Add schedule · เพิ่มตาราง</div>
          <form action={boundCreateSchedule} className="flex gap-2 items-end flex-wrap">
            <input name="taskDescription" placeholder="e.g. Clean AC filters" required className="flex-[2] min-w-[160px]" />
            <input name="intervalDays" type="number" placeholder="Days" required className="flex-1 min-w-[80px]" />
            <button type="submit" className="border border-line bg-[var(--card)] text-brand rounded-lg px-3 py-2.5 text-xs font-semibold hover:bg-[var(--bg)] transition-colors whitespace-nowrap">+ Add</button>
          </form>
        </div>
      </div>

      {/* Repair history */}
      <div className="bg-[var(--card)] rounded-2xl shadow-card px-5 py-4">
        <div className="text-sm font-bold mb-[14px]">Repair tickets · ประวัติการซ่อม</div>
        {tickets.length === 0 ? (
          <div className="text-[12.5px] text-tertiary py-2">No repair history yet.</div>
        ) : (
          <div className="flex flex-col">
            {tickets.map((t) => {
              const stMap: Record<string, { dot: string; label: string }> = {
                OPEN: { dot: "#f43f5e", label: "Open" },
                IN_PROGRESS: { dot: "#5b5bd6", label: "In progress" },
                RESOLVED: { dot: "#10b981", label: "Resolved" },
              };
              const st = stMap[t.status] || stMap.OPEN;
              return (
                <div key={t.id} className="flex gap-[14px]">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full mt-[5px] flex-none" style={{ background: st.dot }} />
                    <div className="w-0.5 flex-1 bg-[var(--line)]" />
                  </div>
                  <div className="pb-[18px] flex-1">
                    <div className="text-[13px] font-semibold flex items-center gap-2">
                      {t.problemDescription}
                      <span className="text-[10px] font-semibold rounded-full px-2 py-[2px]" style={{ color: st.dot, background: `${st.dot}18` }}>{st.label}</span>
                    </div>
                    <div className="text-[11.5px] text-tertiary">
                      {t.openedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {t.cost ? ` · ฿${Number(t.cost).toLocaleString()}` : ""}
                      {t.resolutionNotes ? ` · ${t.resolutionNotes}` : ""}
                    </div>
                    {t.status !== "RESOLVED" && (
                      <form action={transitionTicketAction.bind(null, deviceId, t.id)} className="flex gap-2 items-center mt-2">
                        <select name="status" className="text-xs py-1.5 w-auto">
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                        </select>
                        <input name="cost" type="number" placeholder="Cost ฿" className="w-24 text-xs py-1.5" />
                        <input name="resolutionNotes" placeholder="Notes" className="flex-1 text-xs py-1.5" />
                        <button type="submit" className="border border-line bg-[var(--card)] text-brand rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--bg)] transition-colors whitespace-nowrap">Update</button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Log repair */}
      <div className="bg-[var(--card)] rounded-2xl shadow-card p-5">
        <div className="text-sm font-bold mb-3">Log a repair · แจ้งซ่อม</div>
        <form action={boundCreateTicket} className="flex gap-2 items-end">
          <textarea name="problemDescription" placeholder="Describe what's wrong… อธิบายปัญหา" required rows={2} className="flex-1" />
          <button type="submit" className="border-none bg-brand text-white rounded-[10px] px-4 py-2.5 text-[13px] font-semibold hover:bg-brand-hover transition-colors whitespace-nowrap">🔧 Create</button>
        </form>
      </div>

      {/* Actions */}
      {!device.archivedAt && (
        <div className="flex gap-2 flex-wrap">
          <Link href={`/devices/${deviceId}/edit`} className="border border-line bg-[var(--card)] text-secondary rounded-[10px] px-4 py-[11px] text-[13px] font-semibold hover:bg-[var(--bg)] transition-colors">✏️ Edit</Link>
          <Link href={`/devices/${deviceId}/replace`} className="border border-line bg-[var(--card)] text-secondary rounded-[10px] px-4 py-[11px] text-[13px] font-semibold hover:bg-[var(--bg)] transition-colors">🔄 Replace</Link>
        </div>
      )}
    </div>
  );
}
