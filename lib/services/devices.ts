import { prisma } from '../db'

export function computeWarrantyExpiresAt(
  purchaseDate: Date | null | undefined,
  warrantyMonths: number | null | undefined
): Date | null {
  if (!purchaseDate || !warrantyMonths) return null
  const expires = new Date(purchaseDate)
  expires.setMonth(expires.getMonth() + warrantyMonths)
  return expires
}

export async function createDevice(params: {
  propertyId: string
  locationId: string
  category: string
  brand: string
  model: string
  purchaseDate?: Date
  purchaseVendor?: string
  warrantyMonths?: number
  receiptPhotoUrl?: string
  notes?: string
}) {
  return prisma.device.create({
    data: {
      propertyId: params.propertyId,
      locationId: params.locationId,
      category: params.category,
      brand: params.brand,
      model: params.model,
      purchaseDate: params.purchaseDate ?? null,
      purchaseVendor: params.purchaseVendor ?? null,
      warrantyMonths: params.warrantyMonths ?? null,
      warrantyExpiresAt: computeWarrantyExpiresAt(params.purchaseDate, params.warrantyMonths),
      receiptPhotoUrl: params.receiptPhotoUrl ?? null,
      notes: params.notes ?? null,
    },
  })
}

export async function listDevices(propertyId: string, opts: { includeArchived?: boolean } = {}) {
  return prisma.device.findMany({
    where: {
      propertyId,
      ...(opts.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getDeviceWithHistory(deviceId: string) {
  return prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      location: true,
      replacesDevice: true,
      replacedByDevice: true,
    },
  })
}

export async function updateDevice(params: {
  deviceId: string
  locationId?: string
  category?: string
  brand?: string
  model?: string
  purchaseDate?: Date
  purchaseVendor?: string
  warrantyMonths?: number
  receiptPhotoUrl?: string
  notes?: string
}) {
  const existing = await prisma.device.findUniqueOrThrow({ where: { id: params.deviceId } })

  const purchaseDate = params.purchaseDate ?? existing.purchaseDate ?? undefined
  const warrantyMonths = params.warrantyMonths ?? existing.warrantyMonths ?? undefined

  return prisma.device.update({
    where: { id: params.deviceId },
    data: {
      ...(params.locationId !== undefined && { locationId: params.locationId }),
      ...(params.category !== undefined && { category: params.category }),
      ...(params.brand !== undefined && { brand: params.brand }),
      ...(params.model !== undefined && { model: params.model }),
      ...(params.purchaseDate !== undefined && { purchaseDate: params.purchaseDate }),
      ...(params.purchaseVendor !== undefined && { purchaseVendor: params.purchaseVendor }),
      ...(params.warrantyMonths !== undefined && { warrantyMonths: params.warrantyMonths }),
      ...(params.receiptPhotoUrl !== undefined && { receiptPhotoUrl: params.receiptPhotoUrl }),
      ...(params.notes !== undefined && { notes: params.notes }),
      warrantyExpiresAt: computeWarrantyExpiresAt(purchaseDate, warrantyMonths),
    },
  })
}

export function warrantyStatus(
  device: { warrantyExpiresAt: Date | null },
  now: Date = new Date()
): 'none' | 'active' | 'expiring_soon' | 'expired' {
  if (!device.warrantyExpiresAt) return 'none'
  const daysUntilExpiry = Math.ceil(
    (device.warrantyExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysUntilExpiry < 0) return 'expired'
  if (daysUntilExpiry <= 30) return 'expiring_soon'
  return 'active'
}
