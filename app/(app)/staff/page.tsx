import { getPrimaryOrganizationId, requireOrgAdmin } from "@/lib/auth-helpers";
import { listStaff } from "@/lib/services/staff";
import { inviteStaffAction } from "./actions";

const AVATAR_COLORS = [
  { bg: "#fde68a", tc: "#92400e" },
  { bg: "#bfdbfe", tc: "#3f3fae" },
  { bg: "#bbf7d0", tc: "#166534" },
  { bg: "#fbcfe8", tc: "#9d174d" },
  { bg: "#e0e7ff", tc: "#3730a3" },
  { bg: "#fecaca", tc: "#991b1b" },
];

export default async function StaffPage() {
  const organizationId = await getPrimaryOrganizationId();
  await requireOrgAdmin(organizationId);
  const staff = await listStaff(organizationId);

  return (
    <div className="max-w-[760px] mx-auto px-5 py-[26px]">
      <div className="flex justify-between items-center flex-wrap gap-2.5 mb-[18px]">
        <div>
          <div className="text-[21px] font-bold">Staff · พนักงาน</div>
          <div className="text-[13px] text-secondary">
            {staff.length} members
          </div>
        </div>
      </div>

      {/* Staff list */}
      <div className="bg-[var(--card)] rounded-[14px] shadow-card overflow-hidden mb-8">
        {staff.map((m, i) => {
          const initials = (m.user.name || m.user.email)
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
          const isAdmin = m.role === "ADMIN";

          return (
            <div
              key={m.id}
              className="flex items-center gap-[13px] px-[18px] py-[14px] border-b border-line"
            >
              <div
                className="w-[38px] h-[38px] rounded-full grid place-items-center text-[12.5px] font-semibold flex-none"
                style={{ background: color.bg, color: color.tc }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold">{m.user.name}</div>
                <div className="text-xs text-tertiary">{m.user.email}</div>
              </div>
              <span
                className="text-[11px] font-semibold rounded-full px-2.5 py-[3px]"
                style={{
                  color: isAdmin ? "#7c3aed" : "#5b5bd6",
                  background: isAdmin
                    ? "rgba(124,58,237,.1)"
                    : "rgba(91,91,214,.1)",
                }}
              >
                {m.role}
              </span>
            </div>
          );
        })}
        {staff.length === 0 && (
          <div className="py-10 text-center text-tertiary">
            <div className="text-[30px]">👥</div>
            <div className="text-[13.5px] mt-1.5">
              No staff yet · ยังไม่มีพนักงาน
            </div>
          </div>
        )}
      </div>

      {/* Invite form */}
      <div className="bg-[var(--card)] rounded-[14px] shadow-card p-5 max-w-md">
        <div className="text-sm font-bold mb-3">
          Invite staff · เชิญพนักงาน
        </div>
        <form action={inviteStaffAction} className="flex flex-col gap-[11px]">
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Name</div>
            <input name="name" placeholder="Nok Srisuk" required />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Email</div>
            <input name="email" type="email" placeholder="nok@company.com" required />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">
              Temporary password
            </div>
            <input
              name="temporaryPassword"
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-secondary mb-[5px]">Role</div>
            <select name="role">
              <option value="STAFF">Staff — assigned work only</option>
              <option value="ADMIN">Admin — full access</option>
            </select>
          </div>
          <button
            type="submit"
            className="border-none bg-brand text-white rounded-[10px] p-3 text-[13.5px] font-semibold mt-1.5 hover:bg-brand-hover transition-colors"
          >
            Send invite · ส่ง
          </button>
        </form>
      </div>
    </div>
  );
}
