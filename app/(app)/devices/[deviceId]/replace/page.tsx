import Link from "next/link";
import { getDeviceWithHistory } from "@/lib/services/devices";
import { listLocations } from "@/lib/services/locations";
import { requireDeviceAccess } from "@/lib/auth-helpers";
import { replaceDeviceAction } from "./actions";

export default async function ReplaceDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  await requireDeviceAccess(deviceId);
  const device = await getDeviceWithHistory(deviceId);
  if (!device) return <p>Device not found</p>;

  const locations = await listLocations(device.propertyId);
  const boundAction = replaceDeviceAction.bind(null, deviceId, device.propertyId);

  return (
    <div className="max-w-md mx-auto px-5 py-[22px]">
      <Link
        href={`/devices/${deviceId}`}
        className="text-brand text-[13px] font-semibold mb-[14px] inline-block"
      >
        ← Back
      </Link>
      <div className="bg-[var(--card)] rounded-2xl shadow-card p-6">
        <div className="text-[17px] font-bold mb-1">
          Replace {device.brand} {device.model}
        </div>
        <div className="text-[12.5px] text-secondary mb-4">
          Archives the old device and links history to the new one.
        </div>
        <form action={boundAction} className="flex flex-col gap-[11px]">
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Location</div>
            <select name="locationId" defaultValue={device.locationId} required>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Category</div>
            <input name="category" defaultValue={device.category} required />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">New brand</div>
              <input name="brand" placeholder="Brand" required />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">New model</div>
              <input name="model" placeholder="Model" required />
            </div>
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">Purchase date</div>
              <input name="purchaseDate" type="date" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">Warranty (months)</div>
              <input name="warrantyMonths" type="number" placeholder="12" />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Link
              href={`/devices/${deviceId}`}
              className="flex-1 border border-line bg-[var(--card)] text-secondary rounded-[10px] p-3 text-[13.5px] font-semibold text-center hover:bg-[var(--bg)] transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="flex-[1.4] border-none bg-brand text-white rounded-[10px] p-3 text-[13.5px] font-semibold hover:bg-brand-hover transition-colors"
            >
              🔄 Replace · แทนที่
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
