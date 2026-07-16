import Link from "next/link";
import { listLocations } from "@/lib/services/locations";
import { listDevices, warrantyStatus } from "@/lib/services/devices";
import { requirePropertyAccess } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { createLocationAction } from "./actions";

function getCategoryIcon(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("air") || c.includes("ac")) return "❄️";
  if (c.includes("pump") || c.includes("water")) return "💧";
  if (c.includes("heater") || c.includes("boiler")) return "🔥";
  if (c.includes("elevator") || c.includes("lift")) return "🛗";
  if (c.includes("tv")) return "📺";
  if (c.includes("wash") || c.includes("laundry")) return "🌀";
  if (c.includes("sauna") || c.includes("spa")) return "🧖";
  if (c.includes("door") || c.includes("lock")) return "🔒";
  return "🔩";
}

function warrantyLabel(device: { warrantyExpiresAt: Date | null }): { text: string; color: string } {
  const status = warrantyStatus(device);
  if (status === "expired") return { text: "expired", color: "#f43f5e" };
  if (status === "expiring_soon") {
    const days = Math.ceil(
      ((device.warrantyExpiresAt?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return { text: `${days}d left`, color: "#d97706" };
  }
  if (status === "active") return { text: "✓ covered", color: "#10b981" };
  return { text: "no warranty", color: "#94a3b8" };
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { propertyId } = await params;
  const { tab = "devices" } = await searchParams;
  await requirePropertyAccess(propertyId);

  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });
  const [locations, devices] = await Promise.all([
    listLocations(propertyId),
    listDevices(propertyId),
  ]);

  const boundCreateLocation = createLocationAction.bind(null, propertyId);

  const TYPE_META: Record<string, { icon: string; color: string }> = {
    villa: { icon: "🏖", color: "rgba(91,91,214,.12)" },
    hotel: { icon: "🏨", color: "rgba(236,72,153,.12)" },
    apartment: { icon: "🏢", color: "rgba(245,158,11,.14)" },
    spa: { icon: "💆", color: "rgba(16,185,129,.12)" },
  };
  const key = property.type.toLowerCase();
  const meta = Object.entries(TYPE_META).find(([k]) => key.includes(k))?.[1] || {
    icon: "🏠",
    color: "rgba(148,163,184,.12)",
  };

  const tabs = [
    { key: "devices", label: "Devices · อุปกรณ์" },
    { key: "locations", label: "Locations · ตำแหน่ง" },
  ];

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-[22px]">
      <Link
        href="/properties"
        className="text-brand text-[13px] font-semibold mb-[14px] inline-block"
      >
        ← Properties
      </Link>

      {/* Header */}
      <div className="flex items-center gap-[14px] mb-[18px]">
        <div
          className="w-[52px] h-[52px] rounded-[14px] grid place-items-center text-[25px]"
          style={{ background: meta.color }}
        >
          {meta.icon}
        </div>
        <div>
          <div className="text-[21px] font-bold">{property.name}</div>
          <div className="text-[13px] text-secondary">
            {property.type} · {property.address} · {devices.length} devices
          </div>
        </div>
        <Link
          href={`/properties/${propertyId}/edit`}
          className="ml-auto text-[13px] font-semibold text-brand border border-line rounded-lg px-3 py-1.5 hover:bg-[var(--bg)] transition-colors"
        >
          ✏️ Edit
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-line mb-4">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/properties/${propertyId}?tab=${t.key}`}
            className={`text-[13.5px] font-semibold px-[14px] py-[9px] border-b-2 transition-colors ${
              tab === t.key
                ? "text-brand border-brand"
                : "text-secondary border-transparent hover:text-primary"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Devices tab */}
      {tab === "devices" && (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
            {devices.map((d) => {
              const icon = getCategoryIcon(d.category);
              const w = warrantyLabel(d);
              return (
                <Link
                  key={d.id}
                  href={`/devices/${d.id}`}
                  className="text-left bg-[var(--card)] rounded-[13px] shadow-card p-[15px] flex gap-3 items-center hover:shadow-lg transition-shadow"
                >
                  <div className="w-10 h-10 rounded-[11px] bg-[var(--bg)] grid place-items-center text-[19px] flex-none">
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold text-primary truncate">
                      {d.category}: {d.brand} {d.model}
                    </div>
                    <div className="text-[11.5px] text-tertiary">
                      {d.brand} {d.model}
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold flex-none"
                    style={{ color: w.color }}
                  >
                    {w.text}
                  </span>
                </Link>
              );
            })}
          </div>
          {devices.length === 0 && (
            <div className="py-10 text-center text-tertiary">
              <div className="text-[30px]">📦</div>
              <div className="text-[13.5px] mt-1.5">
                No devices yet · ยังไม่มีอุปกรณ์
              </div>
              <Link
                href={`/properties/${propertyId}/devices`}
                className="mt-3 inline-block text-brand text-[13px] font-semibold"
              >
                + Add your first device
              </Link>
            </div>
          )}
        </>
      )}

      {/* Locations tab */}
      {tab === "locations" && (
        <div className="max-w-[640px] flex flex-col gap-2.5">
          {locations.map((lo) => {
            const count = devices.filter((d) => d.locationId === lo.id).length;
            return (
              <div
                key={lo.id}
                className="bg-[var(--card)] rounded-xl shadow-card px-[17px] py-[14px] flex justify-between items-center"
              >
                <div className="text-[13.5px] font-semibold">
                  📍 {lo.name}
                </div>
                <span className="text-xs text-tertiary">
                  {count} devices
                </span>
              </div>
            );
          })}
          <form
            action={boundCreateLocation}
            className="flex gap-2 items-center mt-2"
          >
            <input
              name="name"
              placeholder="New location name · ชื่อตำแหน่งใหม่"
              required
              className="flex-1"
            />
            <button
              type="submit"
              className="border-none bg-brand text-white rounded-[10px] px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap hover:bg-brand-hover transition-colors"
            >
              + Add
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
