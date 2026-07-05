import { prisma } from '../db'

export async function createRepairTicket(params: {
  deviceId: string
  problemDescription: string
  vendorId?: string
}) {
  return prisma.repairTicket.create({
    data: {
      deviceId: params.deviceId,
      problemDescription: params.problemDescription,
      vendorId: params.vendorId ?? null,
      status: 'OPEN',
    },
  })
}

export async function transitionTicket(params: {
  ticketId: string
  status: 'IN_PROGRESS' | 'RESOLVED'
  cost?: number
  resolutionNotes?: string
}) {
  return prisma.repairTicket.update({
    where: { id: params.ticketId },
    data: {
      status: params.status,
      cost: params.cost,
      resolutionNotes: params.resolutionNotes,
      resolvedAt: params.status === 'RESOLVED' ? new Date() : undefined,
    },
  })
}

export async function listTicketsForDevice(deviceId: string) {
  return prisma.repairTicket.findMany({
    where: { deviceId },
    orderBy: { openedAt: 'desc' },
  })
}

export async function countTicketsForDevice(deviceId: string) {
  return prisma.repairTicket.count({ where: { deviceId } })
}

export async function listOpenTickets(organizationId: string) {
  return prisma.repairTicket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      device: { property: { organizationId } },
    },
    include: { device: true },
    orderBy: { openedAt: 'asc' },
  })
}
