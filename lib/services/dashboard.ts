import { prisma } from '../db'
import { listDueSchedules } from './maintenance-schedules'
import { listOpenTickets } from './repair-tickets'
import { warrantyStatus } from './devices'

export async function getDashboard(organizationId: string) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 7)

  const [dueSchedules, devicesWithWarranty, openTickets, overdueSchedules] = await Promise.all([
    listDueSchedules(organizationId),
    prisma.device.findMany({
      where: {
        property: { organizationId },
        archivedAt: null,
        warrantyExpiresAt: { not: null },
      },
      include: { property: true, location: true },
    }),
    listOpenTickets(organizationId),
    prisma.maintenanceSchedule.findMany({
      where: {
        nextDueAt: { lt: new Date() },
        device: { property: { organizationId }, archivedAt: null },
      },
      include: { device: { include: { property: true } } },
      orderBy: { nextDueAt: 'asc' },
    }),
  ])

  const expiringWarranties = devicesWithWarranty.filter((d) => {
    const status = warrantyStatus(d)
    return status === 'expiring_soon' || status === 'expired'
  })

  return { dueSchedules, expiringWarranties, openTickets, overdueSchedules }
}
