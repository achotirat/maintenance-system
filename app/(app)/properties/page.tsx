import Link from "next/link";
import { getPrimaryOrganizationId } from "@/lib/auth-helpers";
import { listProperties } from "@/lib/services/properties";
import { prisma } from "@/lib/db";
import { createPropertyAction } from "./actions";

const TYPE_META: Record<string, { icon: string; color: string }> = {
  villa: { icon: "🏖", color: "rgba(91,91,214,.12)" },
  hotel: { icon: "🏨", color: "rgba(236,72,153,.12)" },
  apartment: { icon: "🏢", color: "rgba(245,158,11,.14)" },
  spa: { icon: "💆", color: "rgba(16,185,129,.12)" },
};

function typeMeta(type: string) {
  const key = type.toLowerCase();
  for (const [k, v] of Object.entries(TYPE_META)) {
    if (key.includes(k)) return v;
  }
  return { icon: "🏠", color: "rgba(148,163,184,.12)" };
}

export default async function PropertiesPage() {
  const organizationId = await getPrimaryOrganizationId();
  const properties = await listProperties(organizationId);

  const stats = await Promise.all(
    properties.map(async (p) => {
      const [deviceCount, openIssues] = await Promise.all([
        prisma.device.count({
          where: { propertyId: p.id, archivedAt: null },
        }),
        prisma.repairTicket.count({
          where: {
            status: { in: ["OPEN", "IN_PROGRESS"] },
            device: { propertyId: p.id },
          },
        }),
      ]);
      return { id: p.id, deviceCount, openIssues };
    })
  );

  const statMap = Object.fromEntries(stats.map((s) => [s.id, s]));

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-[26px]">
      <div className="text-[21px] font-bold mb-1">
        Properties · อาคารทั้งหมด
      </div>
      <div className="text-[13px] text-secondary mb-5">
        {properties.length} properties
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(255px,1fr))] gap-[14px] mb-8">
        {properties.map((p) => {
          const meta = typeMeta(p.type);
          const s = statMap[p.id] || { deviceCount: 0, openIssues: 0 };
          return (
            <Link
              key={p.id}
              href={`/properties/${p.id}`}
              className="text-left bg-[var(--card)] rounded-[14px] shadow-card p-[18px] flex flex-col gap-3 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-[11px]">
                <div
                  className="w-[42px] h-[42px] rounded-xl grid place-items-center text-xl"
                  style={{ background: meta.color }}
                >
                  {meta.icon}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-primary">
                    {p.name}
                  </div>
                  <div className="text-[11.5px] text-tertiary">
                    {p.type}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[11.5px] font-semibold text-secondary bg-[var(--bg)] rounded-full px-[9px] py-[3px]">
                  {s.deviceCount} devices
                </span>
                {s.openIssues > 0 ? (
                  <span className="text-[11.5px] font-semibold text-[#f43f5e] bg-[rgba(244,63,94,.1)] rounded-full px-[9px] py-[3px]">
                    {s.openIssues} open issues
                  </span>
                ) : (
                  <span className="text-[11.5px] font-semibold text-[#10b981] bg-[rgba(16,185,129,.1)] rounded-full px-[9px] py-[3px]">
                    ✓ On track
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Add property form */}
      <div className="bg-[var(--card)] rounded-[14px] shadow-card p-5 max-w-md">
        <div className="text-sm font-bold mb-3">
          Add property · เพิ่มอาคาร
        </div>
        <form action={createPropertyAction} className="flex flex-col gap-[11px]">
          <input name="name" placeholder="Property name · ชื่ออาคาร" required />
          <input name="address" placeholder="Address · ที่อยู่" required />
          <select name="type" required>
            <option value="">Type · ประเภท</option>
            <option value="hotel">Hotel · โรงแรม</option>
            <option value="apartment">Apartment · อพาร์ตเมนต์</option>
            <option value="villa">Villa · วิลล่า</option>
            <option value="spa">Spa · สปา</option>
          </select>
          <button
            type="submit"
            className="border-none bg-brand text-white rounded-[10px] p-3 text-[13.5px] font-semibold hover:bg-brand-hover transition-colors"
          >
            Create · สร้าง
          </button>
        </form>
      </div>
    </div>
  );
}
