import Link from "next/link";
import { listDevices, warrantyStatus } from "@/lib/services/devices";
import { listLocations } from "@/lib/services/locations";
import { requirePropertyAccess } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { createDeviceAction } from "./actions";

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

export default async function DevicesPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  await requirePropertyAccess(propertyId);

  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
  });
  const [devices, locations] = await Promise.all([
    listDevices(propertyId),
    listLocations(propertyId),
  ]);
  const boundAction = createDeviceAction.bind(null, propertyId);

  return (
    <div className="max-w-[1200px] mx-auto px-5 py-[22px]">
      <Link
        href={`/properties/${propertyId}`}
        className="text-brand text-[13px] font-semibold mb-[14px] inline-block"
      >
        ← {property.name}
      </Link>

      <div className="flex justify-between items-center flex-wrap gap-3 mb-5">
        <div>
          <div className="text-[21px] font-bold">
            Devices · อุปกรณ์
          </div>
          <div className="text-[13px] text-secondary">
            {devices.length} devices in {property.name}
          </div>
        </div>
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 mb-8">
        {devices.map((d) => {
          const icon = getCategoryIcon(d.category);
          const status = warrantyStatus(d);
          const wColor =
            status === "expired"
              ? "#f43f5e"
              : status === "expiring_soon"
                ? "#d97706"
                : status === "active"
                  ? "#10b981"
                  : "#94a3b8";
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
                style={{ color: wColor }}
              >
                {status.replace("_", " ")}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Add device form */}
      <div className="bg-[var(--card)] rounded-[14px] shadow-card p-5 max-w-md">
        <div className="text-sm font-bold mb-3">
          Add device · เพิ่มอุปกรณ์
        </div>
        <form
          action={boundAction}
          encType="multipart/form-data"
          className="flex flex-col gap-[11px]"
        >
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Location · ตำแหน่ง
            </div>
            <select name="locationId" required>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">
                Category
              </div>
              <input
                name="category"
                placeholder="e.g. Air conditioner"
                required
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">
                Brand
              </div>
              <input name="brand" placeholder="Brand" required />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Model
            </div>
            <input name="model" placeholder="Model" required />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">
                Purchase date
              </div>
              <input name="purchaseDate" type="date" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">
                Warranty (months)
              </div>
              <input
                name="warrantyMonths"
                type="number"
                placeholder="12"
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Receipt photo
            </div>
            <input name="receiptPhoto" type="file" accept="image/*,.pdf" />
          </div>
          <button
            type="submit"
            className="border-none bg-brand text-white rounded-[10px] p-3 text-[13.5px] font-semibold mt-1.5 hover:bg-brand-hover transition-colors"
          >
            Add device · เพิ่มอุปกรณ์
          </button>
        </form>
      </div>
    </div>
  );
}
