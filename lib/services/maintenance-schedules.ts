import { prisma } from '../db'

export async function createMaintenanceSchedule(params: {
  deviceId: string
  taskDescription: string
  intervalDays: number
  startDate?: Date
}) {
  const start = params.startDate ?? new Date()
  const nextDueAt = new Date(start)
  nextDueAt.setDate(nextDueAt.getDate() + params.intervalDays)

  return prisma.maintenanceSchedule.create({
    data: {
      deviceId: params.deviceId,
      taskDescription: params.taskDescription,
      intervalDays: params.intervalDays,
      nextDueAt,
    },
  })
}

export async function recordCompletion(scheduleId: string, completedAt: Date = new Date()) {
  const schedule = await prisma.maintenanceSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
  })
  const nextDueAt = new Date(completedAt)
  nextDueAt.setDate(nextDueAt.getDate() + schedule.intervalDays)

  return prisma.maintenanceSchedule.update({
    where: { id: scheduleId },
    data: { lastCompletedAt: completedAt, nextDueAt },
  })
}

export async function listSchedulesForDevice(deviceId: string) {
  return prisma.maintenanceSchedule.findMany({
    where: { deviceId },
    orderBy: { nextDueAt: 'asc' },
  })
}

export async function listDueSchedules(organizationId: string, withinDays = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + withinDays)

  return prisma.maintenanceSchedule.findMany({
    where: {
      nextDueAt: { lte: cutoff },
      device: { property: { organizationId }, archivedAt: null },
    },
    include: { device: true },
    orderBy: { nextDueAt: 'asc' },
  })
}
