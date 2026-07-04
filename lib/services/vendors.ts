import { prisma } from '../db'

export async function createVendor(params: {
  organizationId: string
  name: string
  phone?: string
  line?: string
  email?: string
  specialty?: string
  notes?: string
}) {
  return prisma.vendor.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      phone: params.phone ?? null,
      line: params.line ?? null,
      email: params.email ?? null,
      specialty: params.specialty ?? null,
      notes: params.notes ?? null,
    },
  })
}

export async function listVendors(organizationId: string) {
  return prisma.vendor.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  })
}
