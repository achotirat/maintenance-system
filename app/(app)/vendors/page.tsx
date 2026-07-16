import { getPrimaryOrganizationId } from "@/lib/auth-helpers";
import { listVendors } from "@/lib/services/vendors";
import { createVendorAction, deleteVendorAction } from "./actions";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const COLORS = [
  "rgba(91,91,214,.14)",
  "rgba(14,165,233,.16)",
  "rgba(139,92,246,.16)",
  "rgba(245,158,11,.18)",
  "rgba(16,185,129,.16)",
  "rgba(236,72,153,.14)",
];

export default async function VendorsPage() {
  const organizationId = await getPrimaryOrganizationId();
  const vendors = await listVendors(organizationId);

  return (
    <div className="max-w-[900px] mx-auto px-5 py-[26px]">
      <div className="text-[21px] font-bold mb-1">
        Vendors · ผู้รับเหมา
      </div>
      <div className="text-[13px] text-secondary mb-4">
        Tap to call or message on LINE
      </div>

      <div className="flex flex-col gap-2.5 mb-8">
        {vendors.map((v, i) => (
          <div
            key={v.id}
            className="bg-[var(--card)] rounded-[14px] shadow-card px-[17px] py-[15px] flex gap-[14px] items-center flex-wrap"
          >
            <div
              className="w-[44px] h-[44px] rounded-xl grid place-items-center text-sm font-bold text-primary flex-none"
              style={{ background: COLORS[i % COLORS.length] }}
            >
              {getInitials(v.name)}
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="text-sm font-bold">{v.name}</div>
              <div className="text-xs text-tertiary">
                {v.phone || "—"} · LINE {v.line || "—"} · {v.email || "—"}
              </div>
              {v.specialty && (
                <div className="flex gap-[5px] mt-1.5 flex-wrap">
                  {v.specialty.split(",").map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold text-secondary bg-[var(--bg)] rounded-full px-[9px] py-[3px]"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {v.phone && (
                <a
                  href={`tel:${v.phone}`}
                  className="w-[44px] h-[44px] rounded-full bg-[rgba(16,185,129,.12)] grid place-items-center text-[17px]"
                  title="Call"
                >
                  📞
                </a>
              )}
              {v.line && (
                <a
                  href={`https://line.me/R/ti/p/${v.line}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-[44px] h-[44px] rounded-full bg-[rgba(6,182,212,.12)] grid place-items-center text-[17px]"
                  title="LINE"
                >
                  💬
                </a>
              )}
              <form action={deleteVendorAction.bind(null, v.id)}>
                <button
                  type="submit"
                  className="w-[44px] h-[44px] rounded-full bg-[rgba(244,63,94,.08)] grid place-items-center text-[17px] hover:bg-[rgba(244,63,94,.15)] transition-colors"
                  title="Delete"
                >
                  🗑
                </button>
              </form>
            </div>
          </div>
        ))}
        {vendors.length === 0 && (
          <div className="py-10 text-center text-tertiary">
            <div className="text-[30px]">📇</div>
            <div className="text-[13.5px] mt-1.5">
              No vendors yet · ยังไม่มีผู้รับเหมา
            </div>
          </div>
        )}
      </div>

      {/* Add vendor form */}
      <div className="bg-[var(--card)] rounded-[14px] shadow-card p-5 max-w-md">
        <div className="text-sm font-bold mb-3">
          Add vendor · เพิ่มผู้รับเหมา
        </div>
        <form action={createVendorAction} className="flex flex-col gap-[11px]">
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Name · ชื่อ
            </div>
            <input name="name" placeholder="Somchai Plumbing" required />
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">
                Phone
              </div>
              <input name="phone" placeholder="081-234-5678" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-secondary mb-[5px]">
                LINE ID
              </div>
              <input name="line" placeholder="@somchai" />
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Specialty · ความเชี่ยวชาญ
            </div>
            <input
              name="specialty"
              placeholder="e.g. Plumbing, Water heaters"
            />
          </div>
          <button
            type="submit"
            className="border-none bg-brand text-white rounded-[10px] p-3 text-[13.5px] font-semibold mt-1.5 hover:bg-brand-hover transition-colors"
          >
            Add vendor · เพิ่ม
          </button>
        </form>
      </div>
    </div>
  );
}
