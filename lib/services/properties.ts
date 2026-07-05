import { prisma } from '../db'
import { ensureDefaultLocation } from './locations'

export async function createProperty(params: {
  organizationId: string
  name: string
  address: string
  type: string
}) {
  const property = await prisma.property.create({
    data: {
      organizationId: params.organizationId,
      name: params.name,
      address: params.address,
      type: params.type,
    },
  })
  await ensureDefaultLocation(property.id)
  return property
}

export async function listProperties(organizationId: string) {
  return prisma.property.findMany({
    where: { organizationId },
    orderBy: { name: 'asc' },
  })
}

export async function updateProperty(params: {
  propertyId: string
  name?: string
  address?: string
  type?: string
}) {
  return prisma.property.update({
    where: { id: params.propertyId },
    data: {
      ...(params.name !== undefined && { name: params.name }),
      ...(params.address !== undefined && { address: params.address }),
      ...(params.type !== undefined && { type: params.type }),
    },
  })
}
