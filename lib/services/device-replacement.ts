import { prisma } from '../db'
import { computeWarrantyExpiresAt } from './devices'

export async function replaceDevice(params: {
  oldDeviceId: string
  newDevice: {
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
  }
}) {
  return prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id: params.oldDeviceId },
      data: { archivedAt: new Date() },
    })

    return tx.device.create({
      data: {
        propertyId: params.newDevice.propertyId,
        locationId: params.newDevice.locationId,
        category: params.newDevice.category,
        brand: params.newDevice.brand,
        model: params.newDevice.model,
        purchaseDate: params.newDevice.purchaseDate ?? null,
        purchaseVendor: params.newDevice.purchaseVendor ?? null,
        warrantyMonths: params.newDevice.warrantyMonths ?? null,
        warrantyExpiresAt: computeWarrantyExpiresAt(
          params.newDevice.purchaseDate,
          params.newDevice.warrantyMonths
        ),
        receiptPhotoUrl: params.newDevice.receiptPhotoUrl ?? null,
        notes: params.newDevice.notes ?? null,
        replacesDeviceId: params.oldDeviceId,
      },
    })
  })
}
