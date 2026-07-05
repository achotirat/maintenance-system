'use server'

import { revalidatePath } from 'next/cache'
import { createDevice } from '@/lib/services/devices'
import { requirePropertyAccess } from '@/lib/auth-helpers'

export async function createDeviceAction(propertyId: string, formData: FormData) {
  await requirePropertyAccess(propertyId)
  const locationId = String(formData.get('locationId') ?? '')
  const category = String(formData.get('category') ?? '')
  const brand = String(formData.get('brand') ?? '')
  const model = String(formData.get('model') ?? '')
  const purchaseDateRaw = String(formData.get('purchaseDate') ?? '')
  const warrantyMonthsRaw = String(formData.get('warrantyMonths') ?? '')

  if (!locationId || !category || !brand || !model) {
    throw new Error('Location, category, brand, and model are required')
  }

  await createDevice({
    propertyId,
    locationId,
    category,
    brand,
    model,
    purchaseDate: purchaseDateRaw ? new Date(purchaseDateRaw) : undefined,
    warrantyMonths: warrantyMonthsRaw ? Number(warrantyMonthsRaw) : undefined,
  })

  revalidatePath(`/properties/${propertyId}/devices`)
}
