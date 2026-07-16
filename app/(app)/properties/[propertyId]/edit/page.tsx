import Link from "next/link";
import { requirePropertyAccess } from "@/lib/auth-helpers";
import { updatePropertyAction } from "./actions";

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const property = await requirePropertyAccess(propertyId);
  const boundAction = updatePropertyAction.bind(null, propertyId);

  return (
    <div className="max-w-md mx-auto px-5 py-[22px]">
      <Link
        href={`/properties/${propertyId}`}
        className="text-brand text-[13px] font-semibold mb-[14px] inline-block"
      >
        ← Back
      </Link>
      <div className="bg-[var(--card)] rounded-2xl shadow-card p-6">
        <div className="text-[17px] font-bold mb-4">
          Edit property · แก้ไขอาคาร
        </div>
        <form action={boundAction} className="flex flex-col gap-[11px]">
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Name · ชื่อ
            </div>
            <input name="name" defaultValue={property.name} required />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Address · ที่อยู่
            </div>
            <input name="address" defaultValue={property.address} required />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Type · ประเภท
            </div>
            <select name="type" defaultValue={property.type} required>
              <option value="hotel">Hotel · โรงแรม</option>
              <option value="apartment">Apartment · อพาร์ตเมนต์</option>
              <option value="villa">Villa · วิลล่า</option>
              <option value="spa">Spa · สปา</option>
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <Link
              href={`/properties/${propertyId}`}
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
