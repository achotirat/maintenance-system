import Link from 'next/link'
import { getPrimaryOrganizationId } from '@/lib/auth-helpers'
import { getDashboard } from '@/lib/services/dashboard'

export default async function DashboardPage() {
  const organizationId = await getPrimaryOrganizationId()
  const { dueSchedules, expiringWarranties, openTickets } = await getDashboard(organizationId)

  return (
    <div>
      <h1>Dashboard</h1>

      <h2>Maintenance due soon ({dueSchedules.length})</h2>
      <ul>
        {dueSchedules.map((s) => (
          <li key={s.id}>
            <Link href={`/devices/${s.deviceId}`}>
              {s.taskDescription} — {s.device.brand} {s.device.model} — due {s.nextDueAt.toDateString()}
            </Link>
          </li>
        ))}
      </ul>

      <h2>Warranties expiring/expired ({expiringWarranties.length})</h2>
      <ul>
        {expiringWarranties.map((d) => (
          <li key={d.id}>
            <Link href={`/devices/${d.id}`}>
              {d.brand} {d.model} — expires {d.warrantyExpiresAt?.toDateString()}
            </Link>
          </li>
        ))}
      </ul>

      <h2>Open repair tickets ({openTickets.length})</h2>
      <ul>
        {openTickets.map((t) => (
          <li key={t.id}>
            <Link href={`/devices/${t.deviceId}`}>
              [{t.status}] {t.device.brand} {t.device.model} — {t.problemDescription}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
