import { prisma } from '../db'
import { listDueSchedules } from './maintenance-schedules'
import { listOpenTickets } from './repair-tickets'
import { warrantyStatus } from './devices'

export async function getDashboard(organizationId: string) {
  const [dueSchedules, devicesWithWarranty, openTickets] = await Promise.all([
    listDueSchedules(organizationId),
    prisma.device.findMany({
      where: {
        property: { organizationId },
        archivedAt: null,
        warrantyExpiresAt: { not: null },
      },
    }),
    listOpenTickets(organizationId),
  ])

  const expiringWarranties = devicesWithWarranty.filter((d) => {
    const status = warrantyStatus(d)
    return status === 'expiring_soon' || status === 'expired'
  })

  return { dueSchedules, expiringWarranties, openTickets }
}
