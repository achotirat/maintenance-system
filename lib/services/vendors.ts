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

export async function updateVendor(params: {
  vendorId: string
  name?: string
  phone?: string
  line?: string
  email?: string
  specialty?: string
  notes?: string
}) {
  return prisma.vendor.update({
    where: { id: params.vendorId },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.phone !== undefined && { phone: params.phone }),
      ...(params.line !== undefined && { line: params.line }),
      ...(params.email !== undefined && { email: params.email }),
      ...(params.specialty !== undefined && { specialty: params.specialty }),
      ...(params.notes !== undefined && { notes: params.notes }),
    },
  })
}

export async function deleteVendor(vendorId: string) {
  await prisma.vendor.delete({ where: { id: vendorId } })
}
