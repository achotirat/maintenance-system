import { prisma } from '../db'

export async function resetDb() {
  await prisma.maintenanceSchedule.deleteMany()
  await prisma.vendor.deleteMany()
  await prisma.device.deleteMany()
  await prisma.location.deleteMany()
  await prisma.property.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
