import bcrypt from 'bcryptjs'
import { prisma } from '../db'

export async function inviteStaffMember(params: {
  organizationId: string
  email: string
  name: string
  temporaryPassword: string
  role?: 'ADMIN' | 'STAFF'
}) {
  const passwordHash = await bcrypt.hash(params.temporaryPassword, 10)

  return prisma.membership.create({
    data: {
      organization: { connect: { id: params.organizationId } },
      role: params.role ?? 'STAFF',
      user: {
        create: {
          email: params.email,
          name: params.name,
          passwordHash,
        },
      },
    },
    include: { user: true },
  })
}

export async function listStaff(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })
}
