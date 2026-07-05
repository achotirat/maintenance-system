import { prisma } from '../db'
import { findSimilarStrings } from '../similarity'

export class SimilarLocationExistsError extends Error {
  constructor(public suggestions: string[]) {
    super(`Similar location name(s) already exist: ${suggestions.join(', ')}`)
    this.name = 'SimilarLocationExistsError'
  }
}

export async function listLocations(propertyId: string) {
  return prisma.location.findMany({ where: { propertyId }, orderBy: { name: 'asc' } })
}

export async function createLocation(params: {
  propertyId: string
  name: string
  force?: boolean
}) {
  const existing = await listLocations(params.propertyId)
  const existingNames = existing.map((l) => l.name)
  const trimmedName = params.name.trim()

  if (!params.force) {
    const similar = findSimilarStrings(trimmedName, existingNames).filter(
      (s) => s.toLowerCase() !== trimmedName.toLowerCase()
    )
    if (similar.length > 0) {
      throw new SimilarLocationExistsError(similar)
    }
  }

  return prisma.location.create({
    data: { propertyId: params.propertyId, name: trimmedName },
  })
}

export async function renameLocation(params: {
  locationId: string
  name: string
  force?: boolean
}) {
  const location = await prisma.location.findUniqueOrThrow({ where: { id: params.locationId } })
  const others = (await listLocations(location.propertyId)).filter((l) => l.id !== params.locationId)
  const trimmedName = params.name.trim()

  if (!params.force) {
    const similar = findSimilarStrings(
      trimmedName,
      others.map((l) => l.name)
    )
    if (similar.length > 0) {
      throw new SimilarLocationExistsError(similar)
    }
  }

  return prisma.location.update({
    where: { id: params.locationId },
    data: { name: trimmedName },
  })
}

export async function ensureDefaultLocation(propertyId: string) {
  const existing = await prisma.location.findFirst({
    where: { propertyId, name: 'Whole Property' },
  })
  if (existing) return existing
  return prisma.location.create({
    data: { propertyId, name: 'Whole Property' },
  })
}
