import { prisma } from '../db'

export async function resetDb() {
  await prisma.membership.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
