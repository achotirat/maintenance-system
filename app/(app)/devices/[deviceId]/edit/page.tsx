import Link from "next/link";
import { getDeviceWithHistory } from "@/lib/services/devices";
import { requireDeviceAccess } from "@/lib/auth-helpers";
import { updateDeviceAction } from "./actions";

export default async function EditDevicePage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  await requireDeviceAccess(deviceId);
  const device = await getDeviceWithHistory(deviceId);
  if (!device) return <p>Device not found</p>;

  const boundAction = updateDeviceAction.bind(null, deviceId);

  return (
    <div className="max-w-md mx-auto px-5 py-[22px]">
      <Link
        href={`/devices/${deviceId}`}
        className="text-brand text-[13px] font-semibold mb-[14px] inline-block"
      >
        ← Back
      </Link>
      <div className="bg-[var(--card)] rounded-2xl shadow-card p-6">
        <div className="text-[17px] font-bold mb-4">
          Edit device · แก้ไขอุปกรณ์
        </div>
        <form
          action={boundAction}
          encType="multipart/form-data"
          className="flex flex-col gap-[11px]"
        >
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Brand</div>
            <input name="brand" defaultValue={device.brand} required />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Model</div>
            <input name="model" defaultValue={device.model} required />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">Purchase date</div>
              <input
                name="purchaseDate"
                type="date"
                defaultValue={device.purchaseDate?.toISOString().slice(0, 10)}
              />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">Warranty (months)</div>
              <input
                name="warrantyMonths"
                type="number"
                defaultValue={device.warrantyMonths ?? undefined}
              />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Notes</div>
            <textarea name="notes" defaultValue={device.notes ?? ""} rows={3} />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Receipt photo</div>
            <input name="receiptPhoto" type="file" accept="image/*,.pdf" />
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
              Save · บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
