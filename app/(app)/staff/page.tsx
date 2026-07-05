import { getPrimaryOrganizationId, requireOrgAdmin } from '@/lib/auth-helpers'
import { listStaff } from '@/lib/services/staff'
import { inviteStaffAction } from './actions'

export default async function StaffPage() {
  const organizationId = await getPrimaryOrganizationId()
  await requireOrgAdmin(organizationId)
  const staff = await listStaff(organizationId)

  return (
    <div>
      <h1>Staff</h1>
      <ul>
        {staff.map((m) => (
          <li key={m.id}>
            {m.user.name} ({m.user.email}) — {m.role}
          </li>
        ))}
      </ul>

      <form action={inviteStaffAction}>
        <h2>Invite staff member</h2>
        <input name="name" placeholder="Name" required />
        <input name="email" type="email" placeholder="Email" required />
        <input name="temporaryPassword" type="password" placeholder="Temporary password" required minLength={8} />
        <select name="role">
          <option value="STAFF">Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit">Invite</button>
      </form>
    </div>
  )
}
