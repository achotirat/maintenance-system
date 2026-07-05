import bcrypt from 'bcryptjs'
import { prisma } from '../db'

export async function createOrganizationWithOwner(params: {
  organizationName: string
  ownerEmail: string
  ownerPassword: string
  ownerName: string
}) {
  const passwordHash = await bcrypt.hash(params.ownerPassword, 10)

  return prisma.organization.create({
    data: {
      name: params.organizationName,
      memberships: {
        create: {
          role: 'ADMIN',
          user: {
            create: {
              email: params.ownerEmail,
              passwordHash,
              name: params.ownerName,
            },
          },
        },
      },
    },
    include: { memberships: { include: { user: true } } },
  })
}
